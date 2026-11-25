const { query, withTransaction } = require('../config/database');
const bookRepository = require('../repositories/bookRepository');
const orderRepository = require('../repositories/orderRepository');
const PaymentContext = require('./payment/PaymentContext');
const VietQrStrategy = require('./payment/VietQrStrategy');

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED'];

const orderService = {
  /**
   * Tạo đơn hàng trong một PostgreSQL Transaction (Supabase):
   * 1. Khóa dòng sách (FOR UPDATE) & kiểm tra tồn kho thực tế.
   * 2. Tạo bản ghi orders (PENDING).
   * 3. Áp dụng Payment Strategy (COD hoặc VIETQR) để sinh mã giao dịch nếu là VietQR.
   * 4. Lưu order_items với unit_price hiện tại từ DB & trừ stock.
   */
  async createOrder({ userId, cart, shippingAddress, phone, paymentMethod = 'COD' }) {
    if (!Array.isArray(cart) || cart.length === 0) {
      throw new Error('Giỏ hàng của bạn đang trống.');
    }

    const cleanAddress = (shippingAddress || '').trim();
    const cleanPhone = (phone || '').trim();
    if (!cleanAddress || !cleanPhone) {
      throw new Error('Vui lòng nhập đầy đủ địa chỉ giao hàng và số điện thoại.');
    }

    const normalizedMethod =
      String(paymentMethod || 'COD').trim().toUpperCase() === 'VIETQR' ? 'VIETQR' : 'COD';

    const { orderId, paymentResult } = await withTransaction(async (client) => {
      let totalAmount = 0;
      const verifiedItems = [];

      for (const item of cart) {
        const qty = Number(item.quantity);
        if (!Number.isInteger(qty) || qty <= 0) {
          throw new Error('Số lượng sản phẩm trong giỏ hàng không hợp lệ.');
        }

        const book = await bookRepository.findByIdForUpdate(Number(item.bookId), client);
        if (!book || !book.is_active) {
          throw new Error(`Sách "${item.title || item.bookId}" hiện không còn kinh doanh.`);
        }

        if (book.stock < qty) {
          throw new Error(
            `Sách "${book.title}" không đủ tồn kho (còn ${book.stock}, yêu cầu ${qty}).`
          );
        }

        totalAmount += book.price * qty;
        verifiedItems.push({
          book_id: book.id,
          quantity: qty,
          unit_price: book.price,
        });
      }

      const createdOrderId = await orderRepository.createOrder(
        {
          user_id: Number(userId),
          total_amount: totalAmount,
          shipping_address: cleanAddress,
          phone: cleanPhone,
          payment_method: normalizedMethod,
          status: 'PENDING',
        },
        client
      );

      // Thực thi Strategy Pattern (CodStrategy / VietQrStrategy)
      const paymentContext = PaymentContext.fromMethod(normalizedMethod);
      const strategyResult = paymentContext.execute({
        id: createdOrderId,
        total_amount: totalAmount,
      });

      // Lưu payment_status & transaction_code (nếu VietQR)
      await query(
        'UPDATE orders SET payment_status = $1, transaction_code = $2 WHERE id = $3',
        [strategyResult.paymentStatus, strategyResult.transactionCode, createdOrderId],
        client
      );

      for (const item of verifiedItems) {
        await orderRepository.createOrderItem(
          {
            order_id: createdOrderId,
            book_id: item.book_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
          },
          client
        );

        const result = await bookRepository.decrementStock(item.book_id, item.quantity, client);
        if (result.changes === 0) {
          throw new Error('Không thể trừ tồn kho do dữ liệu thay đổi đồng thời. Vui lòng thử lại.');
        }
      }

      return { orderId: createdOrderId, paymentResult: strategyResult };
    });

    const order = await this.getOrderDetail(orderId);
    return { order, paymentResult };
  },

  /**
   * Lấy thông tin trang thanh toán VietQR cho đơn hàng.
   */
  async getVietQrPaymentData(orderId, actorUser) {
    const order = await this.getOrderDetail(orderId, actorUser);
    if (!order) {
      throw new Error('Không tìm thấy đơn hàng.');
    }

    if (order.payment_method !== 'VIETQR') {
      throw new Error('Đơn hàng này không sử dụng phương thức thanh toán VietQR.');
    }

    if (order.status === 'CANCELLED') {
      throw new Error('Đơn hàng đã bị hủy, không thể thanh toán.');
    }

    const vietQr = new VietQrStrategy();
    if (!order.transaction_code) {
      const generatedCode = vietQr.generateTransactionCode(order.id);
      await query('UPDATE orders SET transaction_code = $1 WHERE id = $2', [
        generatedCode,
        order.id,
      ]);
      order.transaction_code = generatedCode;
    }

    const paymentInfo = vietQr.processPayment(order);
    return {
      order,
      qrUrl: paymentInfo.qrUrl,
      bankInfo: paymentInfo.bankInfo,
      transactionCode: paymentInfo.transactionCode,
    };
  },

  /**
   * Webhook xác nhận đã nhận tiền chuyển khoản -> cập nhật payment_status = 'PAID'.
   */
  async confirmPaymentWebhook({ orderId, transactionCode }) {
    let order = null;
    if (orderId) {
      order = await orderRepository.findById(Number(orderId));
    } else if (transactionCode) {
      const { rows } = await query('SELECT * FROM orders WHERE transaction_code = $1', [
        String(transactionCode).trim(),
      ]);
      order = rows[0] || null;
    }

    if (!order) {
      throw new Error('Không tìm thấy đơn hàng tương ứng với mã giao dịch.');
    }

    if (order.status === 'CANCELLED') {
      throw new Error('Không thể xác nhận thanh toán cho đơn hàng đã bị hủy.');
    }

    await query("UPDATE orders SET payment_status = 'PAID' WHERE id = $1", [order.id]);
    return this.getOrderDetail(order.id);
  },

  /**
   * Hủy đơn hàng & hoàn lại tồn kho trong PostgreSQL Transaction:
   * - Khách hàng: chỉ được hủy khi status === 'PENDING' và phải là chủ đơn.
   * - Admin: được hủy khi status là 'PENDING', 'CONFIRMED' hoặc 'SHIPPING'.
   */
  async cancelOrder({ orderId, actorUser }) {
    const cancelledId = await withTransaction(async (client) => {
      const order = await orderRepository.findById(Number(orderId), client);
      if (!order) {
        throw new Error('Không tìm thấy đơn hàng.');
      }

      const isAdmin = actorUser && actorUser.role === 'admin';
      if (!isAdmin && Number(order.user_id) !== Number(actorUser.id)) {
        throw new Error('Bạn không có quyền hủy đơn hàng này.');
      }

      if (isAdmin) {
        if (!['PENDING', 'CONFIRMED', 'SHIPPING'].includes(order.status)) {
          throw new Error(`Không thể hủy đơn hàng đang ở trạng thái ${order.status}.`);
        }
      } else if (order.status !== 'PENDING') {
        throw new Error(
          'Khách hàng chỉ có thể hủy đơn hàng khi đang ở trạng thái Chờ xác nhận (PENDING).'
        );
      }

      await orderRepository.updateStatus(order.id, 'CANCELLED', client);

      const items = await orderRepository.findItemsByOrderId(order.id, client);
      for (const item of items) {
        await bookRepository.incrementStock(item.book_id, item.quantity, client);
      }

      return order.id;
    });

    return this.getOrderDetail(cancelledId);
  },

  /**
   * Admin cập nhật trạng thái đơn hàng:
   * PENDING -> CONFIRMED -> SHIPPING -> COMPLETED (hoặc CANCELLED hoàn kho).
   * Nếu đơn COD chuyển sang COMPLETED, tự động cập nhật payment_status = 'PAID'.
   */
  async updateOrderStatus({ orderId, newStatus, adminUser }) {
    const normalized = String(newStatus || '').trim().toUpperCase();
    if (!VALID_STATUSES.includes(normalized)) {
      throw new Error('Trạng thái đơn hàng không hợp lệ.');
    }

    const order = await orderRepository.findById(Number(orderId));
    if (!order) {
      throw new Error('Không tìm thấy đơn hàng.');
    }

    if (order.status === normalized) {
      return this.getOrderDetail(order.id);
    }

    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new Error(`Đơn hàng đã ở trạng thái cuối (${order.status}), không thể thay đổi.`);
    }

    if (normalized === 'CANCELLED') {
      return this.cancelOrder({ orderId: order.id, actorUser: adminUser });
    }

    const allowedTransitions = {
      PENDING: ['CONFIRMED', 'SHIPPING', 'COMPLETED'],
      CONFIRMED: ['SHIPPING', 'COMPLETED'],
      SHIPPING: ['COMPLETED'],
    };

    if (
      !allowedTransitions[order.status] ||
      !allowedTransitions[order.status].includes(normalized)
    ) {
      throw new Error(`Không thể chuyển trạng thái từ ${order.status} sang ${normalized}.`);
    }

    await orderRepository.updateStatus(order.id, normalized);

    // Nếu đơn COD giao thành công -> tự đánh dấu đã thanh toán
    if (normalized === 'COMPLETED' && order.payment_method === 'COD') {
      await query("UPDATE orders SET payment_status = 'PAID' WHERE id = $1", [order.id]);
    }

    return this.getOrderDetail(order.id);
  },

  async getUserOrders(userId) {
    const orders = await orderRepository.findByUserId(Number(userId));
    return Promise.all(
      orders.map(async (order) => ({
        ...order,
        items: await orderRepository.findItemsByOrderId(order.id),
      }))
    );
  },

  async getOrderDetail(orderId, actorUser = null) {
    const order = await orderRepository.findById(Number(orderId));
    if (!order) {
      return null;
    }

    if (
      actorUser &&
      actorUser.role !== 'admin' &&
      Number(order.user_id) !== Number(actorUser.id)
    ) {
      throw new Error('Bạn không có quyền xem đơn hàng này.');
    }

    const items = await orderRepository.findItemsByOrderId(order.id);
    return {
      ...order,
      items,
    };
  },

  async getAdminOrders({ status = '' } = {}) {
    return orderRepository.findAll({ status });
  },

  async getDashboardStats() {
    const [stats, soldRes] = await Promise.all([
      orderRepository.getDashboardStats(),
      query(`
        SELECT COALESCE(SUM(oi.quantity), 0)::int AS total_sold
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status != 'CANCELLED'
      `),
    ]);
    if (stats.statusCounts.CONFIRMED === undefined) {
      stats.statusCounts.CONFIRMED = 0;
    }
    stats.totalBooksSold = soldRes.rows[0] ? soldRes.rows[0].total_sold : 0;
    return stats;
  },
};

module.exports = orderService;

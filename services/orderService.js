const { query, withTransaction } = require('../config/database');
const bookRepository = require('../repositories/bookRepository');
const orderRepository = require('../repositories/orderRepository');
const PaymentContext = require('./payment/PaymentContext');
const VietQrStrategy = require('./payment/VietQrStrategy');

const VALID_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'SHIPPING',
  'COMPLETED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURNED',
  'RETURN_REJECTED',
];

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
   * Khách hàng xác nhận đã nhận được hàng khi đơn đang SHIPPING:
   * - Kiểm tra đúng chủ sở hữu đơn hàng (user_id) và status === 'SHIPPING'.
   * - Chuyển status -> 'COMPLETED'.
   * - Nếu payment_method === 'COD' -> cập nhật luôn payment_status = 'PAID'.
   */
  async confirmOrderReceived({ orderId, actorUser }) {
    const completedId = await withTransaction(async (client) => {
      const order = await orderRepository.findById(Number(orderId), client);
      if (!order) {
        throw new Error('Không tìm thấy đơn hàng.');
      }

      if (!actorUser || Number(order.user_id) !== Number(actorUser.id)) {
        throw new Error('Bạn không có quyền xác nhận đơn hàng này.');
      }

      if (order.status !== 'SHIPPING') {
        throw new Error('Chỉ có thể xác nhận đã nhận hàng khi đơn đang ở trạng thái Đang giao hàng (SHIPPING).');
      }

      await orderRepository.updateStatus(order.id, 'COMPLETED', client);

      if (order.payment_method === 'COD') {
        await query("UPDATE orders SET payment_status = 'PAID' WHERE id = $1", [order.id], client);
      }

      return order.id;
    });

    return this.getOrderDetail(completedId);
  },

  /**
   * Khách hàng gửi yêu cầu hoàn hàng (chỉ khi đơn đang COMPLETED).
   */
  async requestReturn({ orderId, actorUser, reason }) {
    const cleanReason = (reason || '').trim();
    if (!cleanReason) {
      throw new Error('Vui lòng nhập lý do yêu cầu hoàn hàng.');
    }

    const order = await orderRepository.findById(Number(orderId));
    if (!order) {
      throw new Error('Không tìm thấy đơn hàng.');
    }

    if (!actorUser || Number(order.user_id) !== Number(actorUser.id)) {
      throw new Error('Bạn không có quyền gửi yêu cầu hoàn hàng cho đơn này.');
    }

    if (order.status !== 'COMPLETED') {
      throw new Error('Chỉ có thể yêu cầu hoàn hàng khi đơn hàng đã hoàn thành (COMPLETED).');
    }

    await query(
      "UPDATE orders SET status = 'RETURN_REQUESTED', return_reason = $1 WHERE id = $2",
      [cleanReason, order.id]
    );

    return this.getOrderDetail(order.id);
  },

  /**
   * Admin chấp nhận hoàn hàng (Transaction):
   * - Đổi status -> 'RETURNED'
   * - Đổi payment_status -> 'REFUNDED'
   * - Cộng hoàn lại stock vào bảng books
   */
  async approveReturn({ orderId }) {
    const returnedId = await withTransaction(async (client) => {
      const order = await orderRepository.findById(Number(orderId), client);
      if (!order) {
        throw new Error('Không tìm thấy đơn hàng.');
      }

      if (order.status !== 'RETURN_REQUESTED') {
        throw new Error('Chỉ có thể chấp nhận hoàn hàng cho đơn đang ở trạng thái Yêu cầu hoàn hàng.');
      }

      await query(
        "UPDATE orders SET status = 'RETURNED', payment_status = 'REFUNDED' WHERE id = $1",
        [order.id],
        client
      );

      const items = await orderRepository.findItemsByOrderId(order.id, client);
      for (const item of items) {
        await bookRepository.incrementStock(item.book_id, item.quantity, client);
      }

      return order.id;
    });

    return this.getOrderDetail(returnedId);
  },

  /**
   * Admin từ chối hoàn hàng -> chuyển status sang 'RETURN_REJECTED'.
   */
  async rejectReturn({ orderId }) {
    const order = await orderRepository.findById(Number(orderId));
    if (!order) {
      throw new Error('Không tìm thấy đơn hàng.');
    }

    if (order.status !== 'RETURN_REQUESTED') {
      throw new Error('Chỉ có thể từ chối hoàn hàng cho đơn đang ở trạng thái Yêu cầu hoàn hàng.');
    }

    await orderRepository.updateStatus(order.id, 'RETURN_REJECTED');
    return this.getOrderDetail(order.id);
  },

  /**
   * Hủy đơn hàng, hoàn tồn kho & hoàn tiền (nếu đã thanh toán) trong PostgreSQL Transaction:
   * - Chỉ cho phép hủy khi order.status === 'PENDING' (áp dụng cho cả Khách hàng & Admin).
   * - Nếu status là CONFIRMED / SHIPPING / COMPLETED -> báo lỗi "Đơn hàng đã được xác nhận, không thể hủy".
   * - Nếu payment_status === 'PAID' -> tự động cập nhật payment_status = 'REFUNDED'.
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

      if (order.status === 'CANCELLED') {
        throw new Error('Đơn hàng này đã được hủy trước đó.');
      }

      if (order.status !== 'PENDING') {
        throw new Error('Đơn hàng đã được xác nhận, không thể hủy');
      }

      await orderRepository.updateStatus(order.id, 'CANCELLED', client);

      if (order.payment_status === 'PAID') {
        await query("UPDATE orders SET payment_status = 'REFUNDED' WHERE id = $1", [order.id], client);
      }

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
    const [stats, revenueRes, soldRes] = await Promise.all([
      orderRepository.getDashboardStats(),
      query(`
        SELECT COALESCE(SUM(total_amount), 0)::int AS revenue
        FROM orders
        WHERE status IN ('COMPLETED', 'RETURN_REJECTED')
      `),
      query(`
        SELECT COALESCE(SUM(oi.quantity), 0)::int AS total_sold
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status NOT IN ('CANCELLED', 'RETURNED')
      `),
    ]);

    for (const key of ['CONFIRMED', 'RETURN_REQUESTED', 'RETURNED', 'RETURN_REJECTED']) {
      if (stats.statusCounts[key] === undefined) {
        stats.statusCounts[key] = 0;
      }
    }

    stats.totalRevenue = revenueRes.rows[0] ? revenueRes.rows[0].revenue : 0;
    stats.totalBooksSold = soldRes.rows[0] ? soldRes.rows[0].total_sold : 0;
    return stats;
  },
};

module.exports = orderService;

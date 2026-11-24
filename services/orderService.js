const db = require('../config/database');
const bookRepository = require('../repositories/bookRepository');
const orderRepository = require('../repositories/orderRepository');

const VALID_STATUSES = ['PENDING', 'SHIPPING', 'COMPLETED', 'CANCELLED'];

const orderService = {
  /**
   * Tạo đơn hàng trong một SQLite Transaction:
   * 1. Kiểm tra tồn kho thực tế của toàn bộ sách trong giỏ.
   * 2. Tạo bản ghi orders (PENDING).
   * 3. Lưu order_items với unit_price hiện tại từ DB.
   * 4. Trừ stock trong bảng books.
   */
  createOrder({ userId, cart, shippingAddress, phone, paymentMethod = 'COD' }) {
    if (!Array.isArray(cart) || cart.length === 0) {
      throw new Error('Giỏ hàng của bạn đang trống.');
    }

    const cleanAddress = (shippingAddress || '').trim();
    const cleanPhone = (phone || '').trim();
    if (!cleanAddress || !cleanPhone) {
      throw new Error('Vui lòng nhập đầy đủ địa chỉ giao hàng và số điện thoại.');
    }

    const createOrderTx = db.transaction(() => {
      let totalAmount = 0;
      const verifiedItems = [];

      for (const item of cart) {
        const qty = Number(item.quantity);
        if (!Number.isInteger(qty) || qty <= 0) {
          throw new Error('Số lượng sản phẩm trong giỏ hàng không hợp lệ.');
        }

        const book = bookRepository.findById(Number(item.bookId));
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

      const orderId = orderRepository.createOrder({
        user_id: Number(userId),
        total_amount: totalAmount,
        shipping_address: cleanAddress,
        phone: cleanPhone,
        payment_method: paymentMethod || 'COD',
        status: 'PENDING',
      });

      for (const item of verifiedItems) {
        orderRepository.createOrderItem({
          order_id: orderId,
          book_id: item.book_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        });

        const result = bookRepository.decrementStock(item.book_id, item.quantity);
        if (result.changes === 0) {
          throw new Error('Không thể trừ tồn kho do dữ liệu thay đổi đồng thời. Vui lòng thử lại.');
        }
      }

      return orderId;
    });

    const newOrderId = createOrderTx();
    return this.getOrderDetail(newOrderId);
  },

  /**
   * Hủy đơn hàng & hoàn lại tồn kho trong SQLite Transaction:
   * - Khách hàng: chỉ được hủy khi status === 'PENDING' và phải là chủ đơn.
   * - Admin: được hủy khi status === 'PENDING' hoặc 'SHIPPING'.
   */
  cancelOrder({ orderId, actorUser }) {
    const cancelTx = db.transaction(() => {
      const order = orderRepository.findById(Number(orderId));
      if (!order) {
        throw new Error('Không tìm thấy đơn hàng.');
      }

      const isAdmin = actorUser && actorUser.role === 'admin';
      if (!isAdmin && Number(order.user_id) !== Number(actorUser.id)) {
        throw new Error('Bạn không có quyền hủy đơn hàng này.');
      }

      if (isAdmin) {
        if (order.status !== 'PENDING' && order.status !== 'SHIPPING') {
          throw new Error(
            `Không thể hủy đơn hàng đang ở trạng thái ${order.status}.`
          );
        }
      } else if (order.status !== 'PENDING') {
        throw new Error('Khách hàng chỉ có thể hủy đơn hàng khi đang ở trạng thái Chờ xác nhận (PENDING).');
      }

      orderRepository.updateStatus(order.id, 'CANCELLED');

      const items = orderRepository.findItemsByOrderId(order.id);
      for (const item of items) {
        bookRepository.incrementStock(item.book_id, item.quantity);
      }

      return order.id;
    });

    const cancelledId = cancelTx();
    return this.getOrderDetail(cancelledId);
  },

  /**
   * Admin cập nhật trạng thái đơn hàng.
   * Nếu chuyển sang CANCELLED -> gọi cancelOrder để đảm bảo hoàn tồn kho.
   */
  updateOrderStatus({ orderId, newStatus, adminUser }) {
    const normalized = String(newStatus || '').trim().toUpperCase();
    if (!VALID_STATUSES.includes(normalized)) {
      throw new Error('Trạng thái đơn hàng không hợp lệ.');
    }

    const order = orderRepository.findById(Number(orderId));
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

    // Kiểm tra luồng chuyển hợp lệ: PENDING -> SHIPPING / COMPLETED, SHIPPING -> COMPLETED
    const allowedTransitions = {
      PENDING: ['SHIPPING', 'COMPLETED'],
      SHIPPING: ['COMPLETED'],
    };

    if (!allowedTransitions[order.status] || !allowedTransitions[order.status].includes(normalized)) {
      throw new Error(`Không thể chuyển trạng thái từ ${order.status} sang ${normalized}.`);
    }

    orderRepository.updateStatus(order.id, normalized);
    return this.getOrderDetail(order.id);
  },

  getUserOrders(userId) {
    const orders = orderRepository.findByUserId(Number(userId));
    return orders.map((order) => ({
      ...order,
      items: orderRepository.findItemsByOrderId(order.id),
    }));
  },

  getOrderDetail(orderId, actorUser = null) {
    const order = orderRepository.findById(Number(orderId));
    if (!order) {
      return null;
    }

    if (actorUser && actorUser.role !== 'admin' && Number(order.user_id) !== Number(actorUser.id)) {
      throw new Error('Bạn không có quyền xem đơn hàng này.');
    }

    const items = orderRepository.findItemsByOrderId(order.id);
    return {
      ...order,
      items,
    };
  },

  getAdminOrders({ status = '' } = {}) {
    return orderRepository.findAll({ status });
  },

  getDashboardStats() {
    return orderRepository.getDashboardStats();
  },
};

module.exports = orderService;

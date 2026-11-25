const orderService = require('../../services/orderService');

const orderController = {
  showCheckout(req, res) {
    const cart = Array.isArray(req.session.cart) ? req.session.cart : [];
    if (cart.length === 0) {
      req.session.flash = {
        type: 'error',
        message: 'Giỏ hàng đang trống. Vui lòng chọn sách trước khi thanh toán.',
      };
      return res.redirect('/books');
    }

    const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return res.render('client/checkout', {
      title: 'Thanh toán - Bookstore MVC',
      layout: 'layouts/main',
      cart,
      totalAmount,
      user: req.session.user,
    });
  },

  async placeOrder(req, res) {
    try {
      const cart = Array.isArray(req.session.cart) ? req.session.cart : [];
      const { shipping_address, phone, payment_method } = req.body;

      const { order, paymentResult } = await orderService.createOrder({
        userId: req.session.user.id,
        cart,
        shippingAddress: shipping_address,
        phone,
        paymentMethod: payment_method || 'COD',
      });

      req.session.cart = [];

      if (paymentResult.paymentMethod === 'VIETQR') {
        req.session.flash = {
          type: 'success',
          message: `Đã tạo đơn hàng #${order.id}. Vui lòng quét mã VietQR để hoàn tất thanh toán.`,
        };
        return res.redirect(paymentResult.redirectUrl);
      }

      req.session.flash = {
        type: 'success',
        message: `Đặt hàng thành công! Mã đơn hàng #${order.id}.`,
      };
      return res.redirect(`/orders/${order.id}`);
    } catch (err) {
      req.session.flash = {
        type: 'error',
        message: err.message,
      };
      return res.redirect('/checkout');
    }
  },

  async listOrders(req, res, next) {
    try {
      const orders = await orderService.getUserOrders(req.session.user.id);
      return res.render('client/orders', {
        title: 'Đơn hàng của tôi - Bookstore MVC',
        layout: 'layouts/main',
        orders,
      });
    } catch (err) {
      return next(err);
    }
  },

  async orderDetail(req, res, next) {
    try {
      const order = await orderService.getOrderDetail(req.params.id, req.session.user);
      if (!order) {
        req.session.flash = {
          type: 'error',
          message: 'Không tìm thấy đơn hàng bạn yêu cầu.',
        };
        return res.redirect('/orders');
      }

      return res.render('client/order-detail', {
        title: `Theo dõi đơn hàng #${order.id} - Bookstore MVC`,
        layout: 'layouts/main',
        order,
      });
    } catch (err) {
      if (String(err.message).includes('không có quyền')) {
        req.session.flash = { type: 'error', message: err.message };
        return res.redirect('/orders');
      }
      return next(err);
    }
  },

  async getOrderStatus(req, res) {
    try {
      const order = await orderService.getOrderDetail(req.params.id, req.session.user);
      if (!order) {
        return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
      }
      return res.json({
        orderId: order.id,
        status: order.status,
        payment_status: order.payment_status || 'UNPAID',
        payment_method: order.payment_method,
        transaction_code: order.transaction_code || null,
      });
    } catch (err) {
      return res.status(403).json({ error: err.message });
    }
  },

  async showPaymentQr(req, res) {
    try {
      const data = await orderService.getVietQrPaymentData(req.params.id, req.session.user);
      if (data.order.payment_status === 'PAID') {
        req.session.flash = {
          type: 'success',
          message: `Đơn hàng #${data.order.id} đã được thanh toán thành công!`,
        };
        return res.redirect(`/orders/${data.order.id}`);
      }

      return res.render('client/payment-qr', {
        title: `Thanh toán VietQR - Đơn hàng #${data.order.id}`,
        layout: 'layouts/main',
        order: data.order,
        qrUrl: data.qrUrl,
        bankInfo: data.bankInfo,
        transactionCode: data.transactionCode,
      });
    } catch (err) {
      req.session.flash = {
        type: 'error',
        message: err.message,
      };
      return res.redirect('/orders');
    }
  },

  async getPaymentStatus(req, res) {
    try {
      const order = await orderService.getOrderDetail(req.params.id, req.session.user);
      if (!order) {
        return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
      }
      return res.json({
        orderId: order.id,
        status: order.status,
        payment_status: order.payment_status || 'UNPAID',
        transaction_code: order.transaction_code || null,
        isPaid: order.payment_status === 'PAID',
        redirectUrl: `/orders/${order.id}`,
      });
    } catch (err) {
      return res.status(403).json({ error: err.message });
    }
  },

  async paymentWebhook(req, res) {
    try {
      const { orderId, transactionCode } = req.body || {};
      const order = await orderService.confirmPaymentWebhook({ orderId, transactionCode });

      if (req.session) {
        req.session.flash = {
          type: 'success',
          message: `Thanh toán thành công cho đơn hàng #${order.id}! Cảm ơn bạn đã mua sắm.`,
        };
      }

      return res.json({
        success: true,
        orderId: order.id,
        payment_status: order.payment_status,
        redirectUrl: `/orders/${order.id}`,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }
  },

  async cancelOrder(req, res) {
    try {
      await orderService.cancelOrder({
        orderId: req.params.id,
        actorUser: req.session.user,
      });
      req.session.flash = {
        type: 'success',
        message: `Đã hủy đơn hàng #${req.params.id} và hoàn lại tồn kho.`,
      };
    } catch (err) {
      req.session.flash = {
        type: 'error',
        message: err.message,
      };
    }
    const backUrl = req.get('Referer') || '/orders';
    return res.redirect(backUrl);
  },
};

module.exports = orderController;

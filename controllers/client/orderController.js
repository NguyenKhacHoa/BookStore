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

      const order = await orderService.createOrder({
        userId: req.session.user.id,
        cart,
        shippingAddress: shipping_address,
        phone,
        paymentMethod: payment_method || 'COD',
      });

      req.session.cart = [];
      req.session.flash = {
        type: 'success',
        message: `Đặt hàng thành công! Mã đơn hàng #${order.id}.`,
      };
      return res.redirect('/orders');
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
        title: 'Lịch sử đơn hàng - Bookstore MVC',
        layout: 'layouts/main',
        orders,
      });
    } catch (err) {
      return next(err);
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
    return res.redirect('/orders');
  },
};

module.exports = orderController;

const orderService = require('../../services/orderService');

const adminOrderController = {
  list(req, res, next) {
    try {
      const { status = '' } = req.query;
      const orders = orderService.getAdminOrders({ status });

      return res.render('admin/orders', {
        title: 'Quản lý đơn hàng - Admin',
        layout: 'layouts/admin',
        orders,
        currentStatus: status,
      });
    } catch (err) {
      return next(err);
    }
  },

  detail(req, res, next) {
    try {
      const order = orderService.getOrderDetail(req.params.id, req.session.user);
      if (!order) {
        req.session.flash = {
          type: 'error',
          message: 'Không tìm thấy đơn hàng.',
        };
        return res.redirect('/admin/orders');
      }

      return res.render('admin/order-detail', {
        title: `Chi tiết đơn hàng #${order.id} - Admin`,
        layout: 'layouts/admin',
        order,
      });
    } catch (err) {
      return next(err);
    }
  },

  updateStatus(req, res) {
    try {
      const { status } = req.body;
      orderService.updateOrderStatus({
        orderId: req.params.id,
        newStatus: status,
        adminUser: req.session.user,
      });

      req.session.flash = {
        type: 'success',
        message: `Đã cập nhật trạng thái đơn hàng #${req.params.id} thành ${status}.`,
      };
    } catch (err) {
      req.session.flash = {
        type: 'error',
        message: err.message,
      };
    }

    const backUrl = req.get('Referer') || `/admin/orders/${req.params.id}`;
    return res.redirect(backUrl);
  },
};

module.exports = adminOrderController;

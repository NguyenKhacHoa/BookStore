const orderService = require('../../services/orderService');

const adminOrderController = {
  async list(req, res, next) {
    try {
      const { status = '' } = req.query;
      const orders = await orderService.getAdminOrders({ status });

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

  async detail(req, res, next) {
    try {
      const order = await orderService.getOrderDetail(req.params.id, req.session.user);
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

  async updateStatus(req, res) {
    try {
      const { status } = req.body;
      await orderService.updateOrderStatus({
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

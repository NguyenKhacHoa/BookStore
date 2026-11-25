const orderService = require('../../services/orderService');
const bookService = require('../../services/bookService');

const dashboardController = {
  async index(req, res, next) {
    try {
      const [stats, lowStockBooks] = await Promise.all([
        orderService.getDashboardStats(),
        bookService.getLowStockBooks(10, 6),
      ]);

      return res.render('admin/dashboard', {
        title: 'Tổng quan quản trị - Bookstore MVC',
        layout: 'layouts/admin',
        stats,
        lowStockBooks,
      });
    } catch (err) {
      return next(err);
    }
  },
};

module.exports = dashboardController;

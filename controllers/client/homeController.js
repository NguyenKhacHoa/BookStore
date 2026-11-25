const bookService = require('../../services/bookService');

const homeController = {
  async index(req, res, next) {
    try {
      const { featuredBooks, categories } = await bookService.getHomeData();
      return res.render('client/home', {
        title: 'Trang chủ - Bookstore MVC',
        layout: 'layouts/main',
        featuredBooks,
        categories,
      });
    } catch (err) {
      return next(err);
    }
  },
};

module.exports = homeController;

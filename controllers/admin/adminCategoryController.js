const bookService = require('../../services/bookService');

const adminCategoryController = {
  list(req, res, next) {
    try {
      const categories = bookService.getCategoriesWithBookCount();
      return res.render('admin/categories', {
        title: 'Quản lý danh mục - Admin',
        layout: 'layouts/admin',
        categories,
      });
    } catch (err) {
      return next(err);
    }
  },

  create(req, res) {
    try {
      bookService.createCategory({
        name: req.body.name,
        slug: req.body.slug,
      });
      req.session.flash = {
        type: 'success',
        message: 'Thêm danh mục thành công!',
      };
    } catch (err) {
      req.session.flash = {
        type: 'error',
        message: err.message,
      };
    }
    return res.redirect('/admin/categories');
  },

  update(req, res) {
    try {
      bookService.updateCategory(req.params.id, {
        name: req.body.name,
        slug: req.body.slug,
      });
      req.session.flash = {
        type: 'success',
        message: 'Cập nhật danh mục thành công!',
      };
    } catch (err) {
      req.session.flash = {
        type: 'error',
        message: err.message,
      };
    }
    return res.redirect('/admin/categories');
  },

  remove(req, res) {
    try {
      bookService.deleteCategory(req.params.id);
      req.session.flash = {
        type: 'success',
        message: 'Xóa danh mục thành công!',
      };
    } catch (err) {
      req.session.flash = {
        type: 'error',
        message: err.message,
      };
    }
    return res.redirect('/admin/categories');
  },
};

module.exports = adminCategoryController;

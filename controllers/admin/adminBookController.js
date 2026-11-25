const bookService = require('../../services/bookService');

const adminBookController = {
  async list(req, res, next) {
    try {
      const { q = '', category = '', sort = 'newest', page = 1 } = req.query;
      const isNumericCategory = /^\d+$/.test(String(category).trim());

      const [categories, { books, pagination }] = await Promise.all([
        bookService.getAllCategories(),
        bookService.getBooks({
          search: q,
          categoryId: isNumericCategory ? Number(category) : null,
          categorySlug: isNumericCategory ? '' : category,
          sort,
          page,
          limit: 20,
          includeInactive: true,
        }),
      ]);

      return res.render('admin/books', {
        title: 'Quản lý sách - Admin',
        layout: 'layouts/admin',
        books,
        categories,
        pagination,
        filters: { q, category, sort },
      });
    } catch (err) {
      return next(err);
    }
  },

  async showCreateForm(req, res, next) {
    try {
      const categories = await bookService.getAllCategories();
      return res.render('admin/book-form', {
        title: 'Thêm sách mới - Admin',
        layout: 'layouts/admin',
        book: null,
        categories,
        formAction: '/admin/books/create',
      });
    } catch (err) {
      return next(err);
    }
  },

  async create(req, res) {
    try {
      const cover_image = req.file
        ? `/uploads/${req.file.filename}`
        : (req.body.cover_image || '').trim() || '/images/default-book.png';

      await bookService.createBook({
        category_id: req.body.category_id,
        title: req.body.title,
        author: req.body.author,
        price: req.body.price,
        stock: req.body.stock,
        cover_image,
        description: req.body.description,
        is_active: req.body.is_active !== undefined ? Number(req.body.is_active) : 1,
      });

      req.session.flash = {
        type: 'success',
        message: 'Thêm sách mới thành công!',
      };
      return res.redirect('/admin/books');
    } catch (err) {
      req.session.flash = {
        type: 'error',
        message: err.message,
      };
      return res.redirect('/admin/books/create');
    }
  },

  async showEditForm(req, res, next) {
    try {
      const [book, categories] = await Promise.all([
        bookService.getBookById(req.params.id),
        bookService.getAllCategories(),
      ]);

      if (!book) {
        req.session.flash = {
          type: 'error',
          message: 'Không tìm thấy cuốn sách cần chỉnh sửa.',
        };
        return res.redirect('/admin/books');
      }

      return res.render('admin/book-form', {
        title: `Chỉnh sửa: ${book.title} - Admin`,
        layout: 'layouts/admin',
        book,
        categories,
        formAction: `/admin/books/${book.id}/edit`,
      });
    } catch (err) {
      return next(err);
    }
  },

  async update(req, res) {
    try {
      const existing = await bookService.getBookById(req.params.id);
      if (!existing) {
        throw new Error('Không tìm thấy cuốn sách cần cập nhật.');
      }

      const cover_image = req.file
        ? `/uploads/${req.file.filename}`
        : (req.body.cover_image || '').trim() || existing.cover_image;

      await bookService.updateBook(req.params.id, {
        category_id: req.body.category_id,
        title: req.body.title,
        author: req.body.author,
        price: req.body.price,
        stock: req.body.stock,
        cover_image,
        description: req.body.description,
        is_active:
          req.body.is_active !== undefined ? Number(req.body.is_active) : existing.is_active,
      });

      req.session.flash = {
        type: 'success',
        message: 'Cập nhật thông tin sách thành công!',
      };
      return res.redirect('/admin/books');
    } catch (err) {
      req.session.flash = {
        type: 'error',
        message: err.message,
      };
      return res.redirect(`/admin/books/${req.params.id}/edit`);
    }
  },

  async remove(req, res) {
    try {
      const result = await bookService.deleteOrHideBook(req.params.id);
      req.session.flash = {
        type: 'success',
        message: result.message,
      };
    } catch (err) {
      req.session.flash = {
        type: 'error',
        message: err.message,
      };
    }
    return res.redirect('/admin/books');
  },

  async toggleStatus(req, res) {
    try {
      const nextState = await bookService.toggleBookActive(req.params.id);
      req.session.flash = {
        type: 'success',
        message: nextState ? 'Đã mở bán lại cuốn sách.' : 'Đã ẩn cuốn sách khỏi trang bán hàng.',
      };
    } catch (err) {
      req.session.flash = {
        type: 'error',
        message: err.message,
      };
    }
    return res.redirect('/admin/books');
  },
};

module.exports = adminBookController;

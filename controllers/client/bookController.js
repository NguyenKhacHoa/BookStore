const bookService = require('../../services/bookService');

const bookController = {
  list(req, res, next) {
    try {
      const { q = '', category = '', sort = 'newest', page = 1 } = req.query;
      const categories = bookService.getCategoriesWithBookCount();

      // Hỗ trợ lọc theo slug hoặc id của danh mục
      const isNumericCategory = /^\d+$/.test(String(category).trim());
      const { books, pagination } = bookService.getBooks({
        search: q,
        categoryId: isNumericCategory ? Number(category) : null,
        categorySlug: isNumericCategory ? '' : category,
        sort,
        page,
        limit: 12,
        includeInactive: false,
      });

      return res.render('client/books', {
        title: 'Danh mục sách - Bookstore MVC',
        layout: 'layouts/main',
        books,
        categories,
        pagination,
        filters: { q, category, sort },
      });
    } catch (err) {
      return next(err);
    }
  },

  detail(req, res, next) {
    try {
      const result = bookService.getBookDetail(req.params.id);
      if (!result) {
        req.session.flash = {
          type: 'error',
          message: 'Không tìm thấy cuốn sách bạn yêu cầu.',
        };
        return res.redirect('/books');
      }

      return res.render('client/book-detail', {
        title: `${result.book.title} - Bookstore MVC`,
        layout: 'layouts/main',
        book: result.book,
        relatedBooks: result.relatedBooks,
      });
    } catch (err) {
      return next(err);
    }
  },
};

module.exports = bookController;

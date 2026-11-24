const bookRepository = require('../repositories/bookRepository');
const categoryRepository = require('../repositories/categoryRepository');

function toSlug(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const bookService = {
  // ===== BOOKS =====
  getHomeData() {
    const featuredBooks = bookRepository.findFeatured(8);
    const categories = categoryRepository.findAllWithBookCount();
    return { featuredBooks, categories };
  },

  getBooks({
    search = '',
    categoryId = null,
    categorySlug = '',
    sort = 'newest',
    page = 1,
    limit = 12,
    includeInactive = false,
  } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Math.min(50, Number(limit) || 12));
    const offset = (safePage - 1) * safeLimit;

    const total = bookRepository.countAll({
      search,
      categoryId,
      categorySlug,
      includeInactive,
    });
    const books = bookRepository.findAll({
      search,
      categoryId,
      categorySlug,
      sort,
      includeInactive,
      limit: safeLimit,
      offset,
    });

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    return {
      books,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
      },
    };
  },

  getBookById(id) {
    return bookRepository.findById(Number(id));
  },

  getBookDetail(id) {
    const book = bookRepository.findById(Number(id));
    if (!book || !book.is_active) {
      return null;
    }
    const relatedBooks = book.category_id
      ? bookRepository.findRelated(book.category_id, book.id, 4)
      : [];
    return { book, relatedBooks };
  },

  /**
   * Kiểm tra tồn kho trước khi thêm / cập nhật giỏ hàng.
   */
  validateBookStock(bookId, requestedQty) {
    const qty = Number(requestedQty);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new Error('Số lượng phải là số nguyên dương.');
    }

    const book = bookRepository.findById(Number(bookId));
    if (!book || !book.is_active) {
      throw new Error('Cuốn sách này hiện không tồn tại hoặc đã ngừng kinh doanh.');
    }

    if (qty > book.stock) {
      throw new Error('Số lượng vượt quá tồn kho hiện có');
    }

    return book;
  },

  createBook(payload) {
    const title = (payload.title || '').trim();
    const author = (payload.author || '').trim();
    const category_id = Number(payload.category_id);
    const price = Number(payload.price);
    const stock = Number(payload.stock);

    if (!title || !author) {
      throw new Error('Tên sách và tác giả không được để trống.');
    }
    if (!category_id || !categoryRepository.findById(category_id)) {
      throw new Error('Danh mục sách không hợp lệ.');
    }
    if (!Number.isFinite(price) || price < 0) {
      throw new Error('Giá bán phải là số không âm.');
    }
    if (!Number.isInteger(stock) || stock < 0) {
      throw new Error('Số lượng tồn kho phải là số nguyên không âm.');
    }

    return bookRepository.create({
      category_id,
      title,
      author,
      price: Math.round(price),
      stock,
      cover_image: payload.cover_image || '/images/default-book.png',
      description: (payload.description || '').trim(),
      is_active: payload.is_active !== undefined ? Number(payload.is_active) : 1,
    });
  },

  updateBook(id, payload) {
    const existing = bookRepository.findById(Number(id));
    if (!existing) {
      throw new Error('Không tìm thấy sách cần cập nhật.');
    }

    const title = (payload.title || '').trim();
    const author = (payload.author || '').trim();
    const category_id = Number(payload.category_id);
    const price = Number(payload.price);
    const stock = Number(payload.stock);

    if (!title || !author) {
      throw new Error('Tên sách và tác giả không được để trống.');
    }
    if (!category_id || !categoryRepository.findById(category_id)) {
      throw new Error('Danh mục sách không hợp lệ.');
    }
    if (!Number.isFinite(price) || price < 0) {
      throw new Error('Giá bán phải là số không âm.');
    }
    if (!Number.isInteger(stock) || stock < 0) {
      throw new Error('Số lượng tồn kho phải là số nguyên không âm.');
    }

    return bookRepository.update(existing.id, {
      category_id,
      title,
      author,
      price: Math.round(price),
      stock,
      cover_image: payload.cover_image || existing.cover_image,
      description: (payload.description || '').trim(),
      is_active: payload.is_active !== undefined ? Number(payload.is_active) : existing.is_active,
    });
  },

  /**
   * Không xóa cứng sách đã từng có trong order_items; chỉ cập nhật is_active = 0.
   */
  deleteOrHideBook(id) {
    const existing = bookRepository.findById(Number(id));
    if (!existing) {
      throw new Error('Không tìm thấy sách.');
    }

    if (bookRepository.hasOrderItems(existing.id)) {
      bookRepository.setActive(existing.id, 0);
      return {
        action: 'soft_deleted',
        message: 'Sách đã từng xuất hiện trong đơn hàng nên đã được chuyển sang trạng thái ẩn (ngừng kinh doanh).',
      };
    }

    bookRepository.deleteHard(existing.id);
    return {
      action: 'hard_deleted',
      message: 'Đã xóa sách khỏi hệ thống thành công.',
    };
  },

  toggleBookActive(id) {
    const existing = bookRepository.findById(Number(id));
    if (!existing) {
      throw new Error('Không tìm thấy sách.');
    }
    const nextState = existing.is_active ? 0 : 1;
    bookRepository.setActive(existing.id, nextState);
    return nextState;
  },

  getLowStockBooks(threshold = 10, limit = 5) {
    return bookRepository.findLowStock(threshold, limit);
  },

  // ===== CATEGORIES =====
  getAllCategories() {
    return categoryRepository.findAll();
  },

  getCategoriesWithBookCount() {
    return categoryRepository.findAllWithBookCount();
  },

  createCategory({ name, slug }) {
    const cleanName = (name || '').trim();
    if (!cleanName) {
      throw new Error('Tên danh mục không được để trống.');
    }
    const cleanSlug = toSlug(slug || cleanName);
    if (!cleanSlug) {
      throw new Error('Slug danh mục không hợp lệ.');
    }

    if (categoryRepository.findByName(cleanName)) {
      throw new Error('Tên danh mục đã tồn tại.');
    }
    if (categoryRepository.findBySlug(cleanSlug)) {
      throw new Error('Slug danh mục đã tồn tại.');
    }

    return categoryRepository.create({ name: cleanName, slug: cleanSlug });
  },

  updateCategory(id, { name, slug }) {
    const existing = categoryRepository.findById(Number(id));
    if (!existing) {
      throw new Error('Không tìm thấy danh mục.');
    }

    const cleanName = (name || '').trim();
    if (!cleanName) {
      throw new Error('Tên danh mục không được để trống.');
    }
    const cleanSlug = toSlug(slug || cleanName);

    const byName = categoryRepository.findByName(cleanName);
    if (byName && byName.id !== existing.id) {
      throw new Error('Tên danh mục đã tồn tại.');
    }

    const bySlug = categoryRepository.findBySlug(cleanSlug);
    if (bySlug && bySlug.id !== existing.id) {
      throw new Error('Slug danh mục đã tồn tại.');
    }

    return categoryRepository.update(existing.id, { name: cleanName, slug: cleanSlug });
  },

  deleteCategory(id) {
    const existing = categoryRepository.findById(Number(id));
    if (!existing) {
      throw new Error('Không tìm thấy danh mục.');
    }

    const bookCount = categoryRepository.countBooksInCategory(existing.id);
    if (bookCount > 0) {
      throw new Error(`Không thể xóa danh mục đang chứa ${bookCount} cuốn sách.`);
    }

    categoryRepository.delete(existing.id);
  },
};

module.exports = bookService;

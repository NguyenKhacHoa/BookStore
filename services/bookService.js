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
  async getHomeData() {
    const [featuredBooks, categories] = await Promise.all([
      bookRepository.findFeatured(8),
      categoryRepository.findAllWithBookCount(),
    ]);
    return { featuredBooks, categories };
  },

  async getBooks({
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

    const [total, books] = await Promise.all([
      bookRepository.countAll({
        search,
        categoryId,
        categorySlug,
        includeInactive,
      }),
      bookRepository.findAll({
        search,
        categoryId,
        categorySlug,
        sort,
        includeInactive,
        limit: safeLimit,
        offset,
      }),
    ]);

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

  async getBookById(id) {
    return bookRepository.findById(Number(id));
  },

  async getBookDetail(id) {
    const book = await bookRepository.findById(Number(id));
    if (!book || !book.is_active) {
      return null;
    }
    const relatedBooks = book.category_id
      ? await bookRepository.findRelated(book.category_id, book.id, 4)
      : [];
    return { book, relatedBooks };
  },

  /**
   * Kiểm tra tồn kho trước khi thêm / cập nhật giỏ hàng.
   */
  async validateBookStock(bookId, requestedQty) {
    const qty = Number(requestedQty);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new Error('Số lượng phải là số nguyên dương.');
    }

    const book = await bookRepository.findById(Number(bookId));
    if (!book || !book.is_active) {
      throw new Error('Cuốn sách này hiện không tồn tại hoặc đã ngừng kinh doanh.');
    }

    if (qty > book.stock) {
      throw new Error('Số lượng vượt quá tồn kho hiện có');
    }

    return book;
  },

  async createBook(payload) {
    const title = (payload.title || '').trim();
    const author = (payload.author || '').trim();
    const category_id = Number(payload.category_id);
    const price = Number(payload.price);
    const stock = Number(payload.stock);

    if (!title || !author) {
      throw new Error('Tên sách và tác giả không được để trống.');
    }
    if (!category_id || !(await categoryRepository.findById(category_id))) {
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

  async updateBook(id, payload) {
    const existing = await bookRepository.findById(Number(id));
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
    if (!category_id || !(await categoryRepository.findById(category_id))) {
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
  async deleteOrHideBook(id) {
    const existing = await bookRepository.findById(Number(id));
    if (!existing) {
      throw new Error('Không tìm thấy sách.');
    }

    if (await bookRepository.hasOrderItems(existing.id)) {
      await bookRepository.setActive(existing.id, 0);
      return {
        action: 'soft_deleted',
        message:
          'Sách đã từng xuất hiện trong đơn hàng nên đã được chuyển sang trạng thái ẩn (ngừng kinh doanh).',
      };
    }

    await bookRepository.deleteHard(existing.id);
    return {
      action: 'hard_deleted',
      message: 'Đã xóa sách khỏi hệ thống thành công.',
    };
  },

  async toggleBookActive(id) {
    const existing = await bookRepository.findById(Number(id));
    if (!existing) {
      throw new Error('Không tìm thấy sách.');
    }
    const nextState = existing.is_active ? 0 : 1;
    await bookRepository.setActive(existing.id, nextState);
    return nextState;
  },

  async getLowStockBooks(threshold = 10, limit = 5) {
    return bookRepository.findLowStock(threshold, limit);
  },

  // ===== CATEGORIES =====
  async getAllCategories() {
    return categoryRepository.findAll();
  },

  async getCategoriesWithBookCount() {
    return categoryRepository.findAllWithBookCount();
  },

  async createCategory({ name, slug }) {
    const cleanName = (name || '').trim();
    if (!cleanName) {
      throw new Error('Tên danh mục không được để trống.');
    }
    const cleanSlug = toSlug(slug || cleanName);
    if (!cleanSlug) {
      throw new Error('Slug danh mục không hợp lệ.');
    }

    if (await categoryRepository.findByName(cleanName)) {
      throw new Error('Tên danh mục đã tồn tại.');
    }
    if (await categoryRepository.findBySlug(cleanSlug)) {
      throw new Error('Slug danh mục đã tồn tại.');
    }

    return categoryRepository.create({ name: cleanName, slug: cleanSlug });
  },

  async updateCategory(id, { name, slug }) {
    const existing = await categoryRepository.findById(Number(id));
    if (!existing) {
      throw new Error('Không tìm thấy danh mục.');
    }

    const cleanName = (name || '').trim();
    if (!cleanName) {
      throw new Error('Tên danh mục không được để trống.');
    }
    const cleanSlug = toSlug(slug || cleanName);

    const byName = await categoryRepository.findByName(cleanName);
    if (byName && Number(byName.id) !== Number(existing.id)) {
      throw new Error('Tên danh mục đã tồn tại.');
    }

    const bySlug = await categoryRepository.findBySlug(cleanSlug);
    if (bySlug && Number(bySlug.id) !== Number(existing.id)) {
      throw new Error('Slug danh mục đã tồn tại.');
    }

    return categoryRepository.update(existing.id, { name: cleanName, slug: cleanSlug });
  },

  async deleteCategory(id) {
    const existing = await categoryRepository.findById(Number(id));
    if (!existing) {
      throw new Error('Không tìm thấy danh mục.');
    }

    const bookCount = await categoryRepository.countBooksInCategory(existing.id);
    if (bookCount > 0) {
      throw new Error(`Không thể xóa danh mục đang chứa ${bookCount} cuốn sách.`);
    }

    await categoryRepository.delete(existing.id);
  },
};

module.exports = bookService;

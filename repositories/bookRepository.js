const { query } = require('../config/database');

const bookRepository = {
  async findAll({
    search = '',
    categoryId = null,
    categorySlug = '',
    sort = 'newest',
    includeInactive = false,
    limit = null,
    offset = 0,
  } = {}) {
    const conditions = [];
    const params = [];

    if (!includeInactive) {
      conditions.push('b.is_active = 1');
    }

    if (search && search.trim()) {
      const keyword = `%${search.trim()}%`;
      params.push(keyword);
      const idx = params.length;
      conditions.push(`(b.title ILIKE $${idx} OR b.author ILIKE $${idx})`);
    }

    if (categoryId) {
      params.push(Number(categoryId));
      conditions.push(`b.category_id = $${params.length}`);
    }

    if (categorySlug && categorySlug.trim()) {
      params.push(categorySlug.trim());
      conditions.push(`c.slug = $${params.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy = 'b.created_at DESC, b.id DESC';
    switch (sort) {
      case 'price_asc':
        orderBy = 'b.price ASC, b.id DESC';
        break;
      case 'price_desc':
        orderBy = 'b.price DESC, b.id DESC';
        break;
      case 'title_asc':
        orderBy = 'b.title ASC';
        break;
      case 'stock_asc':
        orderBy = 'b.stock ASC, b.id DESC';
        break;
      default:
        orderBy = 'b.created_at DESC, b.id DESC';
    }

    let sql = `
      SELECT b.*, c.name AS category_name, c.slug AS category_slug
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      ${whereClause}
      ORDER BY ${orderBy}
    `;

    if (limit !== null && limit !== undefined) {
      params.push(Number(limit));
      const limitIdx = params.length;
      params.push(Number(offset));
      const offsetIdx = params.length;
      sql += ` LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
    }

    const { rows } = await query(sql, params);
    return rows;
  },

  async countAll({ search = '', categoryId = null, categorySlug = '', includeInactive = false } = {}) {
    const conditions = [];
    const params = [];

    if (!includeInactive) {
      conditions.push('b.is_active = 1');
    }

    if (search && search.trim()) {
      const keyword = `%${search.trim()}%`;
      params.push(keyword);
      const idx = params.length;
      conditions.push(`(b.title ILIKE $${idx} OR b.author ILIKE $${idx})`);
    }

    if (categoryId) {
      params.push(Number(categoryId));
      conditions.push(`b.category_id = $${params.length}`);
    }

    if (categorySlug && categorySlug.trim()) {
      params.push(categorySlug.trim());
      conditions.push(`c.slug = $${params.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT COUNT(*)::int AS count
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      ${whereClause}
    `;

    const { rows } = await query(sql, params);
    return rows[0].count;
  },

  async findById(id, client = null) {
    const { rows } = await query(
      `SELECT b.*, c.name AS category_name, c.slug AS category_slug
       FROM books b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.id = $1`,
      [id],
      client
    );
    return rows[0] || null;
  },

  async findByIdForUpdate(id, client) {
    const { rows } = await query(
      'SELECT * FROM books WHERE id = $1 FOR UPDATE',
      [id],
      client
    );
    return rows[0] || null;
  },

  async findFeatured(limit = 8) {
    const { rows } = await query(
      `SELECT b.*, c.name AS category_name, c.slug AS category_slug
       FROM books b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.is_active = 1
       ORDER BY b.id DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  },

  async findRelated(categoryId, excludeBookId, limit = 4) {
    const { rows } = await query(
      `SELECT b.*, c.name AS category_name, c.slug AS category_slug
       FROM books b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.is_active = 1 AND b.category_id = $1 AND b.id != $2
       ORDER BY b.id DESC
       LIMIT $3`,
      [categoryId, excludeBookId, limit]
    );
    return rows;
  },

  async findLowStock(threshold = 10, limit = 5) {
    const { rows } = await query(
      `SELECT b.*, c.name AS category_name
       FROM books b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.is_active = 1 AND b.stock <= $1
       ORDER BY b.stock ASC, b.id ASC
       LIMIT $2`,
      [threshold, limit]
    );
    return rows;
  },

  async create({
    category_id,
    title,
    author,
    price,
    stock,
    cover_image = '/images/default-book.png',
    description = '',
    is_active = 1,
  }) {
    const { rows } = await query(
      `INSERT INTO books (category_id, title, author, price, stock, cover_image, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [category_id, title, author, price, stock, cover_image, description, is_active]
    );
    return this.findById(rows[0].id);
  },

  async update(id, { category_id, title, author, price, stock, cover_image, description, is_active }) {
    await query(
      `UPDATE books
       SET category_id = $1,
           title = $2,
           author = $3,
           price = $4,
           stock = $5,
           cover_image = $6,
           description = $7,
           is_active = $8
       WHERE id = $9`,
      [category_id, title, author, price, stock, cover_image, description, is_active, id]
    );
    return this.findById(id);
  },

  async setActive(id, isActive) {
    return query('UPDATE books SET is_active = $1 WHERE id = $2', [isActive ? 1 : 0, id]);
  },

  async deleteHard(id) {
    return query('DELETE FROM books WHERE id = $1', [id]);
  },

  async hasOrderItems(bookId) {
    const { rows } = await query(
      'SELECT COUNT(*)::int AS count FROM order_items WHERE book_id = $1',
      [bookId]
    );
    return rows[0].count > 0;
  },

  async decrementStock(bookId, quantity, client = null) {
    const result = await query(
      'UPDATE books SET stock = stock - $1 WHERE id = $2 AND stock >= $1',
      [quantity, bookId],
      client
    );
    return { changes: result.rowCount };
  },

  async incrementStock(bookId, quantity, client = null) {
    const result = await query(
      'UPDATE books SET stock = stock + $1 WHERE id = $2',
      [quantity, bookId],
      client
    );
    return { changes: result.rowCount };
  },
};

module.exports = bookRepository;

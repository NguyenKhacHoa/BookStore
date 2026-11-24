const db = require('../config/database');

const bookRepository = {
  findAll({
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
      conditions.push('(b.title LIKE ? OR b.author LIKE ?)');
      const keyword = `%${search.trim()}%`;
      params.push(keyword, keyword);
    }

    if (categoryId) {
      conditions.push('b.category_id = ?');
      params.push(Number(categoryId));
    }

    if (categorySlug && categorySlug.trim()) {
      conditions.push('c.slug = ?');
      params.push(categorySlug.trim());
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
      sql += ' LIMIT ? OFFSET ?';
      params.push(Number(limit), Number(offset));
    }

    return db.prepare(sql).all(...params);
  },

  countAll({ search = '', categoryId = null, categorySlug = '', includeInactive = false } = {}) {
    const conditions = [];
    const params = [];

    if (!includeInactive) {
      conditions.push('b.is_active = 1');
    }

    if (search && search.trim()) {
      conditions.push('(b.title LIKE ? OR b.author LIKE ?)');
      const keyword = `%${search.trim()}%`;
      params.push(keyword, keyword);
    }

    if (categoryId) {
      conditions.push('b.category_id = ?');
      params.push(Number(categoryId));
    }

    if (categorySlug && categorySlug.trim()) {
      conditions.push('c.slug = ?');
      params.push(categorySlug.trim());
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT COUNT(*) AS count
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      ${whereClause}
    `;

    return db.prepare(sql).get(...params).count;
  },

  findById(id) {
    return db
      .prepare(`
        SELECT b.*, c.name AS category_name, c.slug AS category_slug
        FROM books b
        LEFT JOIN categories c ON b.category_id = c.id
        WHERE b.id = ?
      `)
      .get(id);
  },

  findFeatured(limit = 8) {
    return db
      .prepare(`
        SELECT b.*, c.name AS category_name, c.slug AS category_slug
        FROM books b
        LEFT JOIN categories c ON b.category_id = c.id
        WHERE b.is_active = 1
        ORDER BY b.id DESC
        LIMIT ?
      `)
      .all(limit);
  },

  findRelated(categoryId, excludeBookId, limit = 4) {
    return db
      .prepare(`
        SELECT b.*, c.name AS category_name, c.slug AS category_slug
        FROM books b
        LEFT JOIN categories c ON b.category_id = c.id
        WHERE b.is_active = 1 AND b.category_id = ? AND b.id != ?
        ORDER BY b.id DESC
        LIMIT ?
      `)
      .all(categoryId, excludeBookId, limit);
  },

  findLowStock(threshold = 10, limit = 5) {
    return db
      .prepare(`
        SELECT b.*, c.name AS category_name
        FROM books b
        LEFT JOIN categories c ON b.category_id = c.id
        WHERE b.is_active = 1 AND b.stock <= ?
        ORDER BY b.stock ASC, b.id ASC
        LIMIT ?
      `)
      .all(threshold, limit);
  },

  create({
    category_id,
    title,
    author,
    price,
    stock,
    cover_image = '/images/default-book.png',
    description = '',
    is_active = 1,
  }) {
    const stmt = db.prepare(`
      INSERT INTO books (category_id, title, author, price, stock, cover_image, description, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      category_id,
      title,
      author,
      price,
      stock,
      cover_image,
      description,
      is_active
    );
    return this.findById(result.lastInsertRowid);
  },

  update(id, { category_id, title, author, price, stock, cover_image, description, is_active }) {
    const stmt = db.prepare(`
      UPDATE books
      SET category_id = ?,
          title = ?,
          author = ?,
          price = ?,
          stock = ?,
          cover_image = ?,
          description = ?,
          is_active = ?
      WHERE id = ?
    `);
    stmt.run(category_id, title, author, price, stock, cover_image, description, is_active, id);
    return this.findById(id);
  },

  setActive(id, isActive) {
    return db.prepare('UPDATE books SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
  },

  deleteHard(id) {
    return db.prepare('DELETE FROM books WHERE id = ?').run(id);
  },

  hasOrderItems(bookId) {
    const row = db
      .prepare('SELECT COUNT(*) AS count FROM order_items WHERE book_id = ?')
      .get(bookId);
    return row.count > 0;
  },

  decrementStock(bookId, quantity) {
    return db
      .prepare('UPDATE books SET stock = stock - ? WHERE id = ? AND stock >= ?')
      .run(quantity, bookId, quantity);
  },

  incrementStock(bookId, quantity) {
    return db
      .prepare('UPDATE books SET stock = stock + ? WHERE id = ?')
      .run(quantity, bookId);
  },
};

module.exports = bookRepository;

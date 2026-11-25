const { query } = require('../config/database');

const categoryRepository = {
  async findAll() {
    const { rows } = await query('SELECT * FROM categories ORDER BY id ASC');
    return rows;
  },

  async findAllWithBookCount() {
    const { rows } = await query(`
      SELECT c.id, c.name, c.slug, COUNT(b.id)::int AS book_count
      FROM categories c
      LEFT JOIN books b ON b.category_id = c.id AND b.is_active = 1
      GROUP BY c.id
      ORDER BY c.id ASC
    `);
    return rows;
  },

  async findById(id) {
    const { rows } = await query('SELECT * FROM categories WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async findBySlug(slug) {
    const { rows } = await query('SELECT * FROM categories WHERE slug = $1', [slug]);
    return rows[0] || null;
  },

  async findByName(name) {
    const { rows } = await query('SELECT * FROM categories WHERE LOWER(name) = LOWER($1)', [name]);
    return rows[0] || null;
  },

  async create({ name, slug }) {
    const { rows } = await query(
      'INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING *',
      [name, slug]
    );
    return rows[0];
  },

  async update(id, { name, slug }) {
    const { rows } = await query(
      'UPDATE categories SET name = $1, slug = $2 WHERE id = $3 RETURNING *',
      [name, slug, id]
    );
    return rows[0] || null;
  },

  async delete(id) {
    return query('DELETE FROM categories WHERE id = $1', [id]);
  },

  async countBooksInCategory(id) {
    const { rows } = await query(
      'SELECT COUNT(*)::int AS count FROM books WHERE category_id = $1',
      [id]
    );
    return rows[0].count;
  },
};

module.exports = categoryRepository;

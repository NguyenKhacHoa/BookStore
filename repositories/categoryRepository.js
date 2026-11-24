const db = require('../config/database');

const categoryRepository = {
  findAll() {
    return db.prepare('SELECT * FROM categories ORDER BY id ASC').all();
  },

  findAllWithBookCount() {
    return db
      .prepare(`
        SELECT c.id, c.name, c.slug, COUNT(b.id) AS book_count
        FROM categories c
        LEFT JOIN books b ON b.category_id = c.id AND b.is_active = 1
        GROUP BY c.id
        ORDER BY c.id ASC
      `)
      .all();
  },

  findById(id) {
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  },

  findBySlug(slug) {
    return db.prepare('SELECT * FROM categories WHERE slug = ?').get(slug);
  },

  findByName(name) {
    return db.prepare('SELECT * FROM categories WHERE LOWER(name) = LOWER(?)').get(name);
  },

  create({ name, slug }) {
    const result = db
      .prepare('INSERT INTO categories (name, slug) VALUES (?, ?)')
      .run(name, slug);
    return this.findById(result.lastInsertRowid);
  },

  update(id, { name, slug }) {
    db.prepare('UPDATE categories SET name = ?, slug = ? WHERE id = ?').run(name, slug, id);
    return this.findById(id);
  },

  delete(id) {
    return db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  },

  countBooksInCategory(id) {
    return db.prepare('SELECT COUNT(*) AS count FROM books WHERE category_id = ?').get(id).count;
  },
};

module.exports = categoryRepository;

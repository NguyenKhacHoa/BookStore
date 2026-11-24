const db = require('../config/database');

const userRepository = {
  findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },

  findById(id) {
    return db
      .prepare(
        'SELECT id, email, full_name, phone, address, role, is_active, created_at FROM users WHERE id = ?'
      )
      .get(id);
  },

  create({ email, password_hash, full_name, phone = null, address = null, role = 'user' }) {
    const stmt = db.prepare(`
      INSERT INTO users (email, password_hash, full_name, phone, address, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);
    const result = stmt.run(email, password_hash, full_name, phone, address, role);
    return this.findById(result.lastInsertRowid);
  },

  findAll() {
    return db
      .prepare(
        'SELECT id, email, full_name, phone, address, role, is_active, created_at FROM users ORDER BY created_at DESC'
      )
      .all();
  },

  countAll() {
    return db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'user'").get().count;
  },
};

module.exports = userRepository;

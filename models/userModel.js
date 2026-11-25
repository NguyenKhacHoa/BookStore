const { query } = require('../config/database');

const userModel = {
  async findByEmail(email) {
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const { rows } = await query(
      'SELECT id, email, full_name, phone, address, role, is_active, created_at FROM users WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  },

  async create({ email, password_hash, full_name, phone = null, address = null, role = 'user' }) {
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, full_name, phone, address, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, 1)
       RETURNING id, email, full_name, phone, address, role, is_active, created_at`,
      [email, password_hash, full_name, phone, address, role]
    );
    return rows[0];
  },

  async findAll() {
    const { rows } = await query(
      'SELECT id, email, full_name, phone, address, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    return rows;
  },

  async countAll() {
    const { rows } = await query(
      "SELECT COUNT(*)::int AS count FROM users WHERE role = 'user'"
    );
    return rows[0].count;
  },
};

module.exports = userModel;

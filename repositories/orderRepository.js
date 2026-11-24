const db = require('../config/database');

const orderRepository = {
  createOrder({
    user_id,
    total_amount,
    shipping_address,
    phone,
    payment_method = 'COD',
    status = 'PENDING',
  }) {
    const stmt = db.prepare(`
      INSERT INTO orders (user_id, total_amount, shipping_address, phone, payment_method, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(user_id, total_amount, shipping_address, phone, payment_method, status);
    return result.lastInsertRowid;
  },

  createOrderItem({ order_id, book_id, quantity, unit_price }) {
    const stmt = db.prepare(`
      INSERT INTO order_items (order_id, book_id, quantity, unit_price)
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(order_id, book_id, quantity, unit_price);
  },

  findById(id) {
    return db
      .prepare(`
        SELECT o.*, u.full_name AS user_name, u.email AS user_email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
      `)
      .get(id);
  },

  findItemsByOrderId(orderId) {
    return db
      .prepare(`
        SELECT oi.*, b.title AS book_title, b.author AS book_author, b.cover_image AS book_cover
        FROM order_items oi
        LEFT JOIN books b ON oi.book_id = b.id
        WHERE oi.order_id = ?
        ORDER BY oi.id ASC
      `)
      .all(orderId);
  },

  findByUserId(userId) {
    return db
      .prepare(`
        SELECT o.*,
               (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
        FROM orders o
        WHERE o.user_id = ?
        ORDER BY o.created_at DESC, o.id DESC
      `)
      .all(userId);
  },

  findAll({ status = '' } = {}) {
    const params = [];
    let whereClause = '';
    if (status && status.trim()) {
      whereClause = 'WHERE o.status = ?';
      params.push(status.trim().toUpperCase());
    }

    return db
      .prepare(`
        SELECT o.*,
               u.full_name AS user_name,
               u.email AS user_email,
               (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        ${whereClause}
        ORDER BY o.created_at DESC, o.id DESC
      `)
      .all(...params);
  },

  updateStatus(id, status) {
    return db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  },

  getDashboardStats() {
    const revenueRow = db
      .prepare("SELECT COALESCE(SUM(total_amount), 0) AS revenue FROM orders WHERE status = 'COMPLETED'")
      .get();

    const orderCountRow = db.prepare('SELECT COUNT(*) AS count FROM orders').get();

    const statusRows = db
      .prepare('SELECT status, COUNT(*) AS count FROM orders GROUP BY status')
      .all();

    const statusCounts = {
      PENDING: 0,
      SHIPPING: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    for (const row of statusRows) {
      statusCounts[row.status] = row.count;
    }

    const activeBooksRow = db
      .prepare('SELECT COUNT(*) AS count FROM books WHERE is_active = 1')
      .get();

    const totalUsersRow = db
      .prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'user'")
      .get();

    const recentOrders = db
      .prepare(`
        SELECT o.*, u.full_name AS user_name, u.email AS user_email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC, o.id DESC
        LIMIT 5
      `)
      .all();

    return {
      totalRevenue: revenueRow.revenue,
      totalOrders: orderCountRow.count,
      statusCounts,
      totalActiveBooks: activeBooksRow.count,
      totalUsers: totalUsersRow.count,
      recentOrders,
    };
  },
};

module.exports = orderRepository;

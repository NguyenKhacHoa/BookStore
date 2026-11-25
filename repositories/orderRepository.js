const { query } = require('../config/database');

const orderRepository = {
  async createOrder(
    {
      user_id,
      total_amount,
      shipping_address,
      phone,
      payment_method = 'COD',
      status = 'PENDING',
    },
    client = null
  ) {
    const { rows } = await query(
      `INSERT INTO orders (user_id, total_amount, shipping_address, phone, payment_method, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [user_id, total_amount, shipping_address, phone, payment_method, status],
      client
    );
    return rows[0].id;
  },

  async createOrderItem({ order_id, book_id, quantity, unit_price }, client = null) {
    return query(
      `INSERT INTO order_items (order_id, book_id, quantity, unit_price)
       VALUES ($1, $2, $3, $4)`,
      [order_id, book_id, quantity, unit_price],
      client
    );
  },

  async findById(id, client = null) {
    const { rows } = await query(
      `SELECT o.*, u.full_name AS user_name, u.email AS user_email
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = $1`,
      [id],
      client
    );
    return rows[0] || null;
  },

  async findItemsByOrderId(orderId, client = null) {
    const { rows } = await query(
      `SELECT oi.*, b.title AS book_title, b.author AS book_author, b.cover_image AS book_cover
       FROM order_items oi
       LEFT JOIN books b ON oi.book_id = b.id
       WHERE oi.order_id = $1
       ORDER BY oi.id ASC`,
      [orderId],
      client
    );
    return rows;
  },

  async findByUserId(userId) {
    const { rows } = await query(
      `SELECT o.*,
              (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM orders o
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC, o.id DESC`,
      [userId]
    );
    return rows;
  },

  async findAll({ status = '' } = {}) {
    const params = [];
    let whereClause = '';
    if (status && status.trim()) {
      params.push(status.trim().toUpperCase());
      whereClause = 'WHERE o.status = $1';
    }

    const { rows } = await query(
      `SELECT o.*,
              u.full_name AS user_name,
              u.email AS user_email,
              (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ${whereClause}
       ORDER BY o.created_at DESC, o.id DESC`,
      params
    );
    return rows;
  },

  async updateStatus(id, status, client = null) {
    return query('UPDATE orders SET status = $1 WHERE id = $2', [status, id], client);
  },

  async getDashboardStats() {
    const [revenueRes, orderCountRes, statusRes, activeBooksRes, totalUsersRes, recentOrdersRes] =
      await Promise.all([
        query("SELECT COALESCE(SUM(total_amount), 0)::int AS revenue FROM orders WHERE status = 'COMPLETED'"),
        query('SELECT COUNT(*)::int AS count FROM orders'),
        query('SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status'),
        query('SELECT COUNT(*)::int AS count FROM books WHERE is_active = 1'),
        query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'user'"),
        query(`
          SELECT o.*, u.full_name AS user_name, u.email AS user_email
          FROM orders o
          LEFT JOIN users u ON o.user_id = u.id
          ORDER BY o.created_at DESC, o.id DESC
          LIMIT 5
        `),
      ]);

    const statusCounts = {
      PENDING: 0,
      SHIPPING: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    for (const row of statusRes.rows) {
      statusCounts[row.status] = row.count;
    }

    return {
      totalRevenue: revenueRes.rows[0].revenue,
      totalOrders: orderCountRes.rows[0].count,
      statusCounts,
      totalActiveBooks: activeBooksRes.rows[0].count,
      totalUsers: totalUsersRes.rows[0].count,
      recentOrders: recentOrdersRes.rows,
    };
  },
};

module.exports = orderRepository;

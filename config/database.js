const { Pool, types } = require('pg');

// Parse PostgreSQL BIGINT (OID 20) thành JS Number để đồng nhất kiểu dữ liệu ID
types.setTypeParser(20, (val) => parseInt(val, 10));

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    '[Database] Cảnh báo: Chưa cấu hình biến môi trường DATABASE_URL trong file .env (Supabase PostgreSQL).'
  );
}

const useSsl = process.env.DB_SSL !== 'false';

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[Database] Lỗi kết nối PostgreSQL pool:', err.message);
});

/**
 * Thực thi 1 câu lệnh SQL có tham số hóa ($1, $2, ...)
 */
async function query(text, params = [], client = null) {
  const executor = client || pool;
  return executor.query(text, params);
}

/**
 * Chạy nhiều câu lệnh SQL trong một PostgreSQL Transaction (BEGIN / COMMIT / ROLLBACK)
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query,
  withTransaction,
};

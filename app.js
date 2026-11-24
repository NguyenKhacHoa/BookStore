const path = require('path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');

// Tự động kết nối SQLite, khởi tạo 5 bảng & nạp seed data
require('./config/database');

const { attachLocals } = require('./middlewares/authMiddleware');
const clientRoutes = require('./routes/clientRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Cấu hình View Engine EJS + Layouts
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Middlewares parse body & phục vụ file tĩnh
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Cấu hình Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'bookstore-mvc-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 ngày
    },
  })
);

// Helper định dạng tiền tệ VNĐ dùng chung trong mọi View EJS
app.locals.formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return `${num.toLocaleString('vi-VN')} ₫`;
};

// Gắn user, cart, flash vào res.locals
app.use(attachLocals);

// Mount Routes
app.use('/', clientRoutes);
app.use('/admin', adminRoutes);

// Xử lý 404
app.use((req, res) => {
  res.status(404).send('404 - Không tìm thấy trang bạn yêu cầu.');
});

// Xử lý lỗi toàn cục (bao gồm lỗi upload Multer)
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  if (err && (err.name === 'MulterError' || String(err.message).includes('tệp hình ảnh'))) {
    if (req.session) {
      req.session.flash = {
        type: 'error',
        message: err.message || 'Lỗi tải ảnh lên. Vui lòng thử lại.',
      };
    }
    return res.redirect(req.get('Referer') || '/admin/books');
  }
  return res.status(500).send(`500 - Lỗi hệ thống: ${err.message || 'Internal Server Error'}`);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Bookstore MVC đang chạy tại http://localhost:${PORT}`);
  });
}

module.exports = app;

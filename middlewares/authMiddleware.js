/**
 * Gắn thông tin user, giỏ hàng và flash message vào res.locals
 * để tất cả các view EJS có thể sử dụng trực tiếp.
 */
function attachLocals(req, res, next) {
  const cart = Array.isArray(req.session.cart) ? req.session.cart : [];
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  res.locals.currentUser = req.session.user || null;
  res.locals.cart = cart;
  res.locals.cartCount = cartCount;
  res.locals.cartTotal = cartTotal;
  res.locals.currentPath = req.path;

  // Flash message 1 lần (tự xóa sau khi đọc)
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;

  next();
}

/**
 * Yêu cầu người dùng phải đăng nhập.
 */
function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    req.session.flash = {
      type: 'error',
      message: 'Vui lòng đăng nhập để tiếp tục.',
    };
    if (req.method === 'GET') {
      req.session.returnTo = req.originalUrl;
    }
    return res.redirect('/login');
  }
  return next();
}

/**
 * Yêu cầu quyền Quản trị viên (Admin).
 * Luôn sử dụng sau requireLogin.
 */
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    req.session.flash = {
      type: 'error',
      message: 'Vui lòng đăng nhập bằng tài khoản quản trị.',
    };
    return res.redirect('/login');
  }

  if (req.session.user.role !== 'admin') {
    return res.status(403).send('403 Forbidden - Bạn không có quyền truy cập khu vực quản trị.');
  }

  return next();
}

/**
 * Chuyển hướng nếu người dùng đã đăng nhập (dùng cho trang /login, /register).
 */
function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect(req.session.user.role === 'admin' ? '/admin' : '/');
  }
  return next();
}

module.exports = {
  attachLocals,
  requireLogin,
  requireAdmin,
  redirectIfAuthenticated,
};

const authService = require('../../services/authService');

const authController = {
  showLogin(req, res) {
    return res.render('client/login', {
      title: 'Đăng nhập - Bookstore MVC',
      layout: 'layouts/main',
      formData: {},
    });
  },

  login(req, res) {
    try {
      const { email, password } = req.body;
      const user = authService.login({ email, password });

      req.session.user = user;
      req.session.flash = {
        type: 'success',
        message: `Chào mừng ${user.full_name} quay trở lại!`,
      };

      const returnTo = req.session.returnTo;
      delete req.session.returnTo;

      if (returnTo && returnTo.startsWith('/')) {
        return res.redirect(returnTo);
      }
      return res.redirect(user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      req.session.flash = {
        type: 'error',
        message: err.message,
      };
      return res.redirect('/login');
    }
  },

  showRegister(req, res) {
    return res.render('client/register', {
      title: 'Đăng ký tài khoản - Bookstore MVC',
      layout: 'layouts/main',
      formData: {},
    });
  },

  register(req, res) {
    try {
      const { email, password, confirm_password, full_name, phone, address } = req.body;

      if (confirm_password !== undefined && password !== confirm_password) {
        throw new Error('Mật khẩu xác nhận không khớp.');
      }

      const user = authService.register({ email, password, full_name, phone, address });
      req.session.user = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        address: user.address,
        role: user.role,
      };
      req.session.flash = {
        type: 'success',
        message: 'Đăng ký tài khoản thành công!',
      };
      return res.redirect('/');
    } catch (err) {
      req.session.flash = {
        type: 'error',
        message: err.message,
      };
      return res.redirect('/register');
    }
  },

  logout(req, res) {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      return res.redirect('/');
    });
  },
};

module.exports = authController;

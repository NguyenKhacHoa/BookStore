const authService = require('../../services/authService');

const authController = {
  showLogin(req, res) {
    return res.render('client/login', {
      title: 'Đăng nhập - Bookstore MVC',
      layout: 'layouts/main',
      formData: {},
    });
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const user = await authService.login({ email, password });

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

  async register(req, res) {
    try {
      const { email, password, confirm_password, full_name, phone, address } = req.body;

      if (confirm_password !== undefined && password !== confirm_password) {
        throw new Error('Mật khẩu xác nhận không khớp.');
      }

      const user = await authService.register({ email, password, full_name, phone, address });
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

  showForgotPassword(req, res) {
    return res.render('client/forgot-password', {
      title: 'Quên mật khẩu - Bookstore MVC',
      layout: 'layouts/main',
    });
  },

  async sendResetOtp(req, res) {
    try {
      const { email } = req.body;
      const resetInfo = await authService.requestPasswordReset(email);

      req.session.passwordReset = {
        email: resetInfo.email,
        otp: resetInfo.otp,
        expiresAt: resetInfo.expiresAt,
      };

      req.session.flash = {
        type: 'success',
        message: resetInfo.sentViaEmail
          ? `Đã gửi mã OTP 6 chữ số tới ${resetInfo.email}. Mã có hiệu lực trong 5 phút.`
          : `Đã tạo mã OTP cho ${resetInfo.email} (chế độ dự phòng: xem mã OTP trong console server). Mã có hiệu lực trong 5 phút.`,
      };
      return res.redirect('/reset-password');
    } catch (err) {
      req.session.flash = {
        type: 'error',
        message: err.message,
      };
      return res.redirect('/forgot-password');
    }
  },

  showResetPassword(req, res) {
    const resetSession = req.session.passwordReset || null;
    if (!resetSession) {
      req.session.flash = {
        type: 'error',
        message: 'Vui lòng nhập email để nhận mã OTP trước.',
      };
      return res.redirect('/forgot-password');
    }

    return res.render('client/reset-password', {
      title: 'Đặt lại mật khẩu - Bookstore MVC',
      layout: 'layouts/main',
      resetEmail: resetSession.email,
    });
  },

  async resetPassword(req, res) {
    try {
      const { otp, new_password, confirm_password } = req.body;
      await authService.resetPasswordWithOtp({
        sessionResetData: req.session.passwordReset,
        otp,
        newPassword: new_password,
        confirmPassword: confirm_password,
      });

      delete req.session.passwordReset;
      req.session.flash = {
        type: 'success',
        message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.',
      };
      return res.redirect('/login');
    } catch (err) {
      req.session.flash = {
        type: 'error',
        message: err.message,
      };
      return res.redirect('/reset-password');
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

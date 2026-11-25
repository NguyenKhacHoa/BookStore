const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');

const authService = {
  async register({ email, password, full_name, phone = '', address = '' }) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (full_name || '').trim();

    if (!cleanEmail || !password || !cleanName) {
      throw new Error('Vui lòng điền đầy đủ họ tên, email và mật khẩu.');
    }

    if (password.length < 6) {
      throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
    }

    const existing = await userRepository.findByEmail(cleanEmail);
    if (existing) {
      throw new Error('Email này đã được đăng ký. Vui lòng sử dụng email khác.');
    }

    const password_hash = await bcrypt.hash(password, 10);

    return userRepository.create({
      email: cleanEmail,
      password_hash,
      full_name: cleanName,
      phone: (phone || '').trim() || null,
      address: (address || '').trim() || null,
      role: 'user',
    });
  },

  async login({ email, password }) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      throw new Error('Vui lòng nhập email và mật khẩu.');
    }

    const user = await userRepository.findByEmail(cleanEmail);
    if (!user) {
      throw new Error('Email hoặc mật khẩu không chính xác.');
    }

    if (!user.is_active) {
      throw new Error('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error('Email hoặc mật khẩu không chính xác.');
    }

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      address: user.address,
      role: user.role,
    };
  },

  async getUserById(id) {
    return userRepository.findById(id);
  },
};

module.exports = authService;

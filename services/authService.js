const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { query } = require('../config/database');
const userModel = require('../models/userModel');

const OTP_TTL_MS = 5 * 60 * 1000; // 5 phút

async function sendResetOtpEmail({ toEmail, otp }) {
  const smtpEmail = (process.env.SMTP_EMAIL || '').trim();
  const smtpPass = (process.env.SMTP_PASS || '').trim();

  if (!smtpEmail || !smtpPass) {
    console.log('====================================================');
    console.log(`[OTP FALLBACK] Chưa cấu hình SMTP_EMAIL / SMTP_PASS`);
    console.log(`Email nhận: ${toEmail}`);
    console.log(`Mã OTP (hiệu lực 5 phút): ${otp}`);
    console.log('====================================================');
    return { sentViaEmail: false };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpEmail,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"Bookstore MVC" <${smtpEmail}>`,
      to: toEmail,
      subject: '[Bookstore MVC] Mã OTP đặt lại mật khẩu',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #4f46e5; margin-top: 0;">Bookstore MVC - Đặt lại mật khẩu</h2>
          <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản <strong>${toEmail}</strong>.</p>
          <p>Mã xác thực OTP gồm 6 chữ số của bạn là:</p>
          <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1e293b; background: #f1f5f9; padding: 14px 20px; border-radius: 10px; text-align: center; margin: 16px 0;">
            ${otp}
          </div>
          <p style="color: #64748b; font-size: 13px;">Mã có hiệu lực trong vòng <strong>5 phút</strong>. Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.</p>
        </div>
      `,
    });

    return { sentViaEmail: true };
  } catch (err) {
    console.error('[OTP Email Error] Gửi email thất bại, dùng console dự phòng:', err.message);
    console.log('====================================================');
    console.log(`[OTP FALLBACK] Email nhận: ${toEmail} | Mã OTP: ${otp}`);
    console.log('====================================================');
    return { sentViaEmail: false };
  }
}

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

    const existing = await userModel.findByEmail(cleanEmail);
    if (existing) {
      throw new Error('Email này đã được đăng ký. Vui lòng sử dụng email khác.');
    }

    const password_hash = await bcrypt.hash(password, 10);

    return userModel.create({
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

    const user = await userModel.findByEmail(cleanEmail);
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

  async requestPasswordReset(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('Vui lòng nhập địa chỉ email của bạn.');
    }

    const user = await userModel.findByEmail(cleanEmail);
    if (!user) {
      throw new Error('Email này chưa được đăng ký trong hệ thống.');
    }

    if (!user.is_active) {
      throw new Error('Tài khoản của bạn đang bị khóa. Không thể đặt lại mật khẩu.');
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + OTP_TTL_MS;

    const { sentViaEmail } = await sendResetOtpEmail({ toEmail: user.email, otp });

    return {
      email: user.email,
      otp,
      expiresAt,
      sentViaEmail,
    };
  },

  async resetPasswordWithOtp({ sessionResetData, otp, newPassword, confirmPassword }) {
    if (!sessionResetData || !sessionResetData.email || !sessionResetData.otp) {
      throw new Error('Phiên đặt lại mật khẩu không tồn tại hoặc đã hết hạn. Vui lòng gửi lại mã OTP.');
    }

    if (Date.now() > Number(sessionResetData.expiresAt)) {
      throw new Error('Mã OTP đã hết hạn (quá 5 phút). Vui lòng yêu cầu mã mới.');
    }

    const cleanOtp = String(otp || '').trim();
    if (cleanOtp !== String(sessionResetData.otp)) {
      throw new Error('Mã OTP không chính xác. Vui lòng kiểm tra lại.');
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      throw new Error('Mật khẩu xác nhận không khớp.');
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE email = $2', [
      password_hash,
      sessionResetData.email,
    ]);

    return { email: sessionResetData.email };
  },

  async getUserById(id) {
    return userModel.findById(id);
  },
};

module.exports = authService;

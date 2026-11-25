const express = require('express');
const router = express.Router();

const { requireLogin, redirectIfAuthenticated } = require('../middlewares/authMiddleware');
const homeController = require('../controllers/client/homeController');
const bookController = require('../controllers/client/bookController');
const cartController = require('../controllers/client/cartController');
const authController = require('../controllers/client/authController');
const orderController = require('../controllers/client/orderController');

// Trang chủ & Danh mục sách
router.get('/', homeController.index);
router.get('/books', bookController.list);
router.get('/books/:id', bookController.detail);

// Xác thực (Đăng nhập, Đăng ký, Quên mật khẩu OTP, Đăng xuất)
router.get('/login', redirectIfAuthenticated, authController.showLogin);
router.post('/login', redirectIfAuthenticated, authController.login);
router.get('/register', redirectIfAuthenticated, authController.showRegister);
router.post('/register', redirectIfAuthenticated, authController.register);
router.get('/forgot-password', redirectIfAuthenticated, authController.showForgotPassword);
router.post('/forgot-password', redirectIfAuthenticated, authController.sendResetOtp);
router.get('/reset-password', redirectIfAuthenticated, authController.showResetPassword);
router.post('/reset-password', redirectIfAuthenticated, authController.resetPassword);
router.post('/logout', requireLogin, authController.logout);

// Giỏ hàng (Session Cart)
router.get('/cart', cartController.viewCart);
router.post('/cart/add', cartController.addToCart);
router.post('/cart/update', cartController.updateCart);
router.post('/cart/remove', cartController.removeFromCart);
router.post('/cart/clear', cartController.clearCart);

// Thanh toán & Theo dõi đơn hàng (Yêu cầu đăng nhập)
router.get('/checkout', requireLogin, orderController.showCheckout);
router.post('/checkout', requireLogin, orderController.placeOrder);

router.get('/orders', requireLogin, orderController.listOrders);
router.get('/orders/:id/payment', requireLogin, orderController.showPaymentQr);
router.get('/orders/:id/payment-status', requireLogin, orderController.getPaymentStatus);
router.get('/orders/:id/status', requireLogin, orderController.getOrderStatus);
router.get('/orders/:id', requireLogin, orderController.orderDetail);
router.post('/orders/:id/cancel', requireLogin, orderController.cancelOrder);

// Webhook xác nhận thanh toán VietQR (Demo / Bank callback)
router.post('/api/payment/webhook', orderController.paymentWebhook);

module.exports = router;

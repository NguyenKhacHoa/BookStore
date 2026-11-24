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

// Xác thực (Đăng nhập, Đăng ký, Đăng xuất)
router.get('/login', redirectIfAuthenticated, authController.showLogin);
router.post('/login', redirectIfAuthenticated, authController.login);
router.get('/register', redirectIfAuthenticated, authController.showRegister);
router.post('/register', redirectIfAuthenticated, authController.register);
router.post('/logout', requireLogin, authController.logout);

// Giỏ hàng (Session Cart)
router.get('/cart', cartController.viewCart);
router.post('/cart/add', cartController.addToCart);
router.post('/cart/update', cartController.updateCart);
router.post('/cart/remove', cartController.removeFromCart);
router.post('/cart/clear', cartController.clearCart);

// Thanh toán & Lịch sử đơn hàng (Yêu cầu đăng nhập)
router.get('/checkout', requireLogin, orderController.showCheckout);
router.post('/checkout', requireLogin, orderController.placeOrder);
router.get('/orders', requireLogin, orderController.listOrders);
router.post('/orders/:id/cancel', requireLogin, orderController.cancelOrder);

module.exports = router;

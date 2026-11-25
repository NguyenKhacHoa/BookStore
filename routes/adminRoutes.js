const express = require('express');
const router = express.Router();

const { requireLogin, requireAdmin } = require('../middlewares/authMiddleware');
const { uploadCover } = require('../middlewares/uploadMiddleware');
const dashboardController = require('../controllers/admin/dashboardController');
const adminBookController = require('../controllers/admin/adminBookController');
const adminCategoryController = require('../controllers/admin/adminCategoryController');
const adminOrderController = require('../controllers/admin/adminOrderController');

// Bảo vệ toàn bộ /admin/* bằng 2 lớp: requireLogin -> requireAdmin
router.use(requireLogin, requireAdmin);

// Dashboard
router.get('/', dashboardController.index);

// Quản lý sách
router.get('/books', adminBookController.list);
router.get('/books/create', adminBookController.showCreateForm);
router.post('/books/create', uploadCover.single('cover_image'), adminBookController.create);
router.get('/books/:id/edit', adminBookController.showEditForm);
router.post('/books/:id/edit', uploadCover.single('cover_image'), adminBookController.update);
router.post('/books/:id/delete', adminBookController.remove);
router.post('/books/:id/toggle', adminBookController.toggleStatus);

// Quản lý danh mục
router.get('/categories', adminCategoryController.list);
router.post('/categories/create', adminCategoryController.create);
router.post('/categories/:id/edit', adminCategoryController.update);
router.post('/categories/:id/delete', adminCategoryController.remove);

// Quản lý đơn hàng
router.get('/orders', adminOrderController.list);
router.get('/orders/:id', adminOrderController.detail);
router.post('/orders/:id/status', adminOrderController.updateStatus);
router.post('/orders/:id/approve-return', adminOrderController.approveReturn);
router.post('/orders/:id/reject-return', adminOrderController.rejectReturn);

module.exports = router;

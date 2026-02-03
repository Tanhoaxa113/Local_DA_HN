/**
 * Admin Routes
 * Routes for dashboard and high-level management
 * Routes dành cho quản trị viên và quản lý
 */
const express = require('express');
const router = express.Router();
const { uploadMultiple } = require('../config/multer');

const adminController = require('../controllers/admin.controller');
const productController = require('../controllers/product.controller');
const orderController = require('../controllers/order.controller');
const categoryController = require('../controllers/category.controller');
const brandController = require('../controllers/brand.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireManager, requireStaff, requireAdmin, requireRole } = require('../middlewares/rbac.middleware');

// All admin routes require authentication
// Tất cả các route admin đều yêu cầu đăng nhập
router.use(authenticate);

// ==========================================
// Dashboard Routes (Manager+)
// Các route Dashboard (Dành cho Manager trở lên)
// ==========================================
router.get('/stats', requireManager, adminController.getDashboardStats); // Thống kê tổng quan
router.get('/revenue', requireManager, adminController.getRevenueChart); // Biểu đồ doanh thu
router.get('/top-products', requireManager, adminController.getTopProducts); // Top sản phẩm bán chạy
router.get('/activity', requireManager, adminController.getRecentActivity); // Hoạt động gần đây

// ==========================================
// Product Management Routes (Manager+)
// Quản lý sản phẩm (Dành cho Manager trở lên - quyền cao hơn Staff bình thường)
// ==========================================
router.get('/products', requireManager, adminController.getProducts); // Danh sách sản phẩm (Admin view)
router.get('/products/:id', requireManager, adminController.getProductById); // Chi tiết sản phẩm
router.post('/products', requireManager, uploadMultiple, adminController.createProduct); // Tạo sản phẩm mới
router.put('/products/:id', requireManager, uploadMultiple, adminController.updateProduct); // Cập nhật sản phẩm
router.delete('/products/:id', requireAdmin, adminController.deleteProduct); // Xóa sản phẩm (Chỉ Admin)
router.post('/products/:id/images', requireManager, uploadMultiple, adminController.uploadProductImages); // Upload ảnh
router.delete('/products/:productId/images/:imageId', requireManager, adminController.deleteProductImage); // Xóa ảnh

// ==========================================
// Order Management Routes (Staff+)
// Quản lý đơn hàng (Dành cho Staff trở lên)
// ==========================================
router.get('/orders', requireStaff, adminController.getOrders); // Danh sách đơn hàng
router.get('/orders/:id', requireStaff, adminController.getOrderById); // Chi tiết đơn hàng
router.put('/orders/:id/status', requireStaff, adminController.updateOrderStatus); // Cập nhật trạng thái đơn
router.post('/orders/:id/refund/approve', requireManager, adminController.approveRefund); // Duyệt hoàn tiền (Chỉ Manager)

// ==========================================
// Category Management Routes (Manager+)
// Quản lý danh mục (Dành cho Manager trở lên)
// ==========================================
router.get('/categories', requireManager, categoryController.getAll); // Danh sách danh mục (đầy đủ)
router.post('/categories', requireManager, adminController.createCategory); // Tạo danh mục
router.put('/categories/:id', requireManager, adminController.updateCategory); // Cập nhật danh mục
router.delete('/categories/:id', requireAdmin, adminController.deleteCategory); // Xóa danh mục (Chỉ Admin)

// ==========================================
// Brand Management Routes (Manager+)
// Quản lý thương hiệu (Dành cho Manager trở lên)
// ==========================================
router.get('/brands', requireManager, brandController.getAll); // Danh sách thương hiệu
router.post('/brands', requireManager, adminController.createBrand); // Tạo thương hiệu
router.put('/brands/:id', requireManager, adminController.updateBrand); // Cập nhật thương hiệu
router.delete('/brands/:id', requireAdmin, adminController.deleteBrand); // Xóa thương hiệu (Chỉ Admin)

// ==========================================
// User Management Routes (Manager+)
// Quản lý người dùng (Dành cho Manager trở lên)
// ==========================================
router.get('/users', requireManager, adminController.getUsers); // Danh sách người dùng
router.get('/users/:id', requireManager, adminController.getUserById); // Chi tiết người dùng
router.put('/users/:id', requireAdmin, adminController.updateUser); // Cập nhật thông tin user (Chỉ Admin)
router.put('/users/:id/status', requireAdmin, adminController.toggleUserStatus); // Khóa/Mở khóa user (Chỉ Admin)

module.exports = router;

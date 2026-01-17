/**
 * Admin Routes
 * Routes for dashboard and high-level management
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
router.use(authenticate);

// ==========================================
// Dashboard Routes (Manager+)
// ==========================================
router.get('/stats', requireManager, adminController.getDashboardStats);
router.get('/revenue', requireManager, adminController.getRevenueChart);
router.get('/top-products', requireManager, adminController.getTopProducts);
router.get('/activity', requireManager, adminController.getRecentActivity);

// ==========================================
// Product Management Routes (Manager+)
// ==========================================
router.get('/products', requireManager, adminController.getProducts);
router.get('/products/:id', requireManager, adminController.getProductById);
router.post('/products', requireManager, uploadMultiple, adminController.createProduct);
router.put('/products/:id', requireManager, uploadMultiple, adminController.updateProduct);
router.delete('/products/:id', requireAdmin, adminController.deleteProduct);
router.post('/products/:id/images', requireManager, uploadMultiple, adminController.uploadProductImages);
router.delete('/products/:productId/images/:imageId', requireManager, adminController.deleteProductImage);

// ==========================================
// Order Management Routes (Staff+)
// ==========================================
router.get('/orders', requireStaff, adminController.getOrders);
router.get('/orders/:id', requireStaff, adminController.getOrderById);
router.put('/orders/:id/status', requireStaff, adminController.updateOrderStatus);
router.post('/orders/:id/refund/approve', requireManager, adminController.approveRefund);

// ==========================================
// Category Management Routes (Manager+)
// ==========================================
router.get('/categories', requireManager, categoryController.getAll);
router.post('/categories', requireManager, adminController.createCategory);
router.put('/categories/:id', requireManager, adminController.updateCategory);
router.delete('/categories/:id', requireAdmin, adminController.deleteCategory);

// ==========================================
// Brand Management Routes (Manager+)
// ==========================================
router.get('/brands', requireManager, brandController.getAll);
router.post('/brands', requireManager, adminController.createBrand);
router.put('/brands/:id', requireManager, adminController.updateBrand);
router.delete('/brands/:id', requireAdmin, adminController.deleteBrand);

// ==========================================
// User Management Routes (Manager+)
// ==========================================
router.get('/users', requireManager, adminController.getUsers);
router.get('/users/:id', requireManager, adminController.getUserById);
router.put('/users/:id', requireAdmin, adminController.updateUser);
router.put('/users/:id/status', requireAdmin, adminController.toggleUserStatus);

module.exports = router;

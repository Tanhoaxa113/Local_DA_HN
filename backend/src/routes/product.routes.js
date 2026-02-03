/**
 * Product Routes
 * Routes for product, variant, and image management
 * Routes quản lý sản phẩm, biến thể và hình ảnh
 */
const express = require('express');
const router = express.Router();

const productController = require('../controllers/product.controller');
const { authenticate, optionalAuth } = require('../middlewares/auth.middleware');
const { requireRole, requireStaff, requireManager } = require('../middlewares/rbac.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { uploadMultiple, uploadSingle } = require('../config/multer');
const {
    createProductSchema,
    updateProductSchema,
    createVariantSchema,
    updateVariantSchema,
    productQuerySchema,
} = require('../validators/product.validator');

/**
 * Public routes
 * Routes công khai
 */

// GET /api/products - List products with filtering
// Lấy danh sách sản phẩm (có lọc, phân trang)
router.get('/', optionalAuth, validate(productQuerySchema), productController.getAll);

// GET /api/products/:idOrSlug - Get product by ID or slug
// Lấy chi tiết sản phẩm theo ID hoặc Slug
router.get('/:idOrSlug', optionalAuth, productController.getById);

/**
 * Protected routes (Staff only)
 * Routes nội bộ (Dành cho nhân viên)
 */

// POST /api/products - Create product
// Tạo sản phẩm mới
router.post(
    '/',
    authenticate,
    requireStaff,
    uploadMultiple,
    validate(createProductSchema),
    productController.create
);

// PUT /api/products/:id - Update product
// Cập nhật thông tin sản phẩm
router.put(
    '/:id',
    authenticate,
    requireStaff,
    validate(updateProductSchema),
    productController.update
);

// DELETE /api/products/:id - Delete product
// Xóa sản phẩm (Yêu cầu quyền Manager)
router.delete(
    '/:id',
    authenticate,
    requireManager,
    productController.remove
);

/**
 * Variant routes
 * Routes quản lý biến thể (Size, Color...)
 */

// POST /api/products/:productId/variants - Add variant
// Thêm biến thể mới
router.post(
    '/:productId/variants',
    authenticate,
    requireStaff,
    validate(createVariantSchema),
    productController.addVariant
);

// PUT /api/products/variants/:variantId - Update variant
// Cập nhật biến thể
router.put(
    '/variants/:variantId',
    authenticate,
    requireStaff,
    validate(updateVariantSchema),
    productController.updateVariant
);

// DELETE /api/products/variants/:variantId - Delete variant
// Xóa biến thể (Yêu cầu quyền Manager)
router.delete(
    '/variants/:variantId',
    authenticate,
    requireManager,
    productController.removeVariant
);

/**
 * Image routes
 * Routes quản lý hình ảnh
 */

// POST /api/products/:productId/images - Add image
// Thêm ảnh cho sản phẩm
router.post(
    '/:productId/images',
    authenticate,
    requireStaff,
    uploadSingle,
    productController.addImage
);

// DELETE /api/products/images/:imageId - Delete image
// Xóa ảnh
router.delete(
    '/images/:imageId',
    authenticate,
    requireStaff,
    productController.removeImage
);

module.exports = router;

/**
 * Brand Routes
 * Routes for brand management
 * Routes quản lý thương hiệu
 */
const express = require('express');
const router = express.Router();

const brandController = require('../controllers/brand.controller');
const { authenticate, optionalAuth } = require('../middlewares/auth.middleware');
const { requireStaff, requireManager } = require('../middlewares/rbac.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { uploadSingle } = require('../config/multer');
const {
    createBrandSchema,
    updateBrandSchema,
} = require('../validators/product.validator');

/**
 * Public routes
 * Public routes (Không cần đăng nhập)
 */

// GET /api/brands - List brands
// Lấy danh sách thương hiệu
router.get('/', optionalAuth, brandController.getAll);

// GET /api/brands/:idOrSlug - Get brand by ID or slug
// Lấy chi tiết thương hiệu
router.get('/:idOrSlug', optionalAuth, brandController.getById);

/**
 * Protected routes (Staff only)
 * Routes nội bộ (Dành cho Manager)
 */

// POST /api/brands - Create brand
// Tạo thương hiệu mới
router.post(
    '/',
    authenticate,
    requireStaff,
    uploadSingle,
    validate(createBrandSchema),
    brandController.create
);

// PUT /api/brands/:id - Update brand
// Cập nhật thương hiệu
router.put(
    '/:id',
    authenticate,
    requireStaff,
    uploadSingle,
    validate(updateBrandSchema),
    brandController.update
);

// DELETE /api/brands/:id - Delete brand
// Xóa thương hiệu (Chỉ Manager)
router.delete(
    '/:id',
    authenticate,
    requireManager,
    brandController.remove
);

module.exports = router;

/**
 * Category Routes
 * Routes for category management
 * Routes quản lý danh mục sản phẩm
 */
const express = require('express');
const router = express.Router();

const categoryController = require('../controllers/category.controller');
const { authenticate, optionalAuth } = require('../middlewares/auth.middleware');
const { requireStaff, requireManager } = require('../middlewares/rbac.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { uploadSingle } = require('../config/multer');
const {
    createCategorySchema,
    updateCategorySchema,
} = require('../validators/product.validator');

/**
 * Public routes
 * Public routes (Không cần đăng nhập)
 */

// GET /api/categories - List categories
// Lấy danh sách danh mục (cây phân cấp hoặc phẳng)
router.get('/', optionalAuth, categoryController.getAll);

// GET /api/categories/:idOrSlug - Get category by ID or slug
// Lấy chi tiết danh mục
router.get('/:idOrSlug', optionalAuth, categoryController.getById);

/**
 * Protected routes (Staff only)
 * Routes nội bộ (Dành cho Manager)
 */

// POST /api/categories - Create category
// Tạo danh mục mới
router.post(
    '/',
    authenticate,
    requireStaff,
    uploadSingle,
    validate(createCategorySchema),
    categoryController.create
);

// PUT /api/categories/:id - Update category
// Cập nhật danh mục
router.put(
    '/:id',
    authenticate,
    requireStaff,
    uploadSingle,
    validate(updateCategorySchema),
    categoryController.update
);

// DELETE /api/categories/:id - Delete category
// Xóa danh mục (Chỉ Manager)
router.delete(
    '/:id',
    authenticate,
    requireManager,
    categoryController.remove
);

module.exports = router;

/**
 * Category Routes
 * Routes for category management
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
 */

// GET /api/categories - List categories
router.get('/', optionalAuth, categoryController.getAll);

// GET /api/categories/:idOrSlug - Get category by ID or slug
router.get('/:idOrSlug', optionalAuth, categoryController.getById);

/**
 * Protected routes (Staff only)
 */

// POST /api/categories - Create category
router.post(
    '/',
    authenticate,
    requireStaff,
    uploadSingle,
    validate(createCategorySchema),
    categoryController.create
);

// PUT /api/categories/:id - Update category
router.put(
    '/:id',
    authenticate,
    requireStaff,
    uploadSingle,
    validate(updateCategorySchema),
    categoryController.update
);

// DELETE /api/categories/:id - Delete category
router.delete(
    '/:id',
    authenticate,
    requireManager,
    categoryController.remove
);

module.exports = router;

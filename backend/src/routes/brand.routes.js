/**
 * Brand Routes
 * Routes for brand management
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
 */

// GET /api/brands - List brands
router.get('/', optionalAuth, brandController.getAll);

// GET /api/brands/:idOrSlug - Get brand by ID or slug
router.get('/:idOrSlug', optionalAuth, brandController.getById);

/**
 * Protected routes (Staff only)
 */

// POST /api/brands - Create brand
router.post(
    '/',
    authenticate,
    requireStaff,
    uploadSingle,
    validate(createBrandSchema),
    brandController.create
);

// PUT /api/brands/:id - Update brand
router.put(
    '/:id',
    authenticate,
    requireStaff,
    uploadSingle,
    validate(updateBrandSchema),
    brandController.update
);

// DELETE /api/brands/:id - Delete brand
router.delete(
    '/:id',
    authenticate,
    requireManager,
    brandController.remove
);

module.exports = router;

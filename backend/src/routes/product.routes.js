/**
 * Product Routes
 * Routes for product, variant, and image management
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
 */

// GET /api/products - List products with filtering
router.get('/', optionalAuth, validate(productQuerySchema), productController.getAll);

// GET /api/products/:idOrSlug - Get product by ID or slug
router.get('/:idOrSlug', optionalAuth, productController.getById);

/**
 * Protected routes (Staff only)
 */

// POST /api/products - Create product
router.post(
    '/',
    authenticate,
    requireStaff,
    uploadMultiple,
    validate(createProductSchema),
    productController.create
);

// PUT /api/products/:id - Update product
router.put(
    '/:id',
    authenticate,
    requireStaff,
    validate(updateProductSchema),
    productController.update
);

// DELETE /api/products/:id - Delete product
router.delete(
    '/:id',
    authenticate,
    requireManager,
    productController.remove
);

/**
 * Variant routes
 */

// POST /api/products/:productId/variants - Add variant
router.post(
    '/:productId/variants',
    authenticate,
    requireStaff,
    validate(createVariantSchema),
    productController.addVariant
);

// PUT /api/products/variants/:variantId - Update variant
router.put(
    '/variants/:variantId',
    authenticate,
    requireStaff,
    validate(updateVariantSchema),
    productController.updateVariant
);

// DELETE /api/products/variants/:variantId - Delete variant
router.delete(
    '/variants/:variantId',
    authenticate,
    requireManager,
    productController.removeVariant
);

/**
 * Image routes
 */

// POST /api/products/:productId/images - Add image
router.post(
    '/:productId/images',
    authenticate,
    requireStaff,
    uploadSingle,
    productController.addImage
);

// DELETE /api/products/images/:imageId - Delete image
router.delete(
    '/images/:imageId',
    authenticate,
    requireStaff,
    productController.removeImage
);

module.exports = router;

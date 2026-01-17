/**
 * Product Controller
 * Handles HTTP requests for product endpoints
 */
const productService = require('../services/product.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendNoContent } = require('../utils/response');
const { getFileUrl } = require('../config/multer');

/**
 * Create a new product
 * POST /api/products
 */
const create = asyncHandler(async (req, res) => {
    const { name, description, categoryId, brandId, isFeatured, variants } = req.body;

    // Handle uploaded images
    const images = [];
    if (req.files) {
        if (req.files.images) {
            req.files.images.forEach((file, index) => {
                images.push({
                    url: getFileUrl(file.filename),
                    isPrimary: index === 0,
                    sortOrder: index,
                });
            });
        }
    }

    // Parse variants if sent as JSON string
    let parsedVariants = variants;
    if (typeof variants === 'string') {
        try {
            parsedVariants = JSON.parse(variants);
        } catch (e) {
            parsedVariants = [];
        }
    }

    const product = await productService.create(
        { name, description, categoryId: parseInt(categoryId, 10), brandId: brandId ? parseInt(brandId, 10) : null, isFeatured },
        parsedVariants || [],
        images
    );

    sendCreated(res, product, 'Product created successfully');
});

/**
 * Get all products with filtering
 * GET /api/products
 */
const getAll = asyncHandler(async (req, res) => {
    const result = await productService.getAll(req.query);

    sendSuccess(res, result, 'Products retrieved successfully');
});

/**
 * Get product by ID or slug
 * GET /api/products/:idOrSlug
 */
const getById = asyncHandler(async (req, res) => {
    const product = await productService.getById(req.params.idOrSlug);

    sendSuccess(res, product, 'Product retrieved successfully');
});

/**
 * Update product
 * PUT /api/products/:id
 */
const update = asyncHandler(async (req, res) => {
    const { name, description, categoryId, brandId, isFeatured, isActive } = req.body;

    const product = await productService.update(parseInt(req.params.id, 10), {
        name,
        description,
        categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
        brandId: brandId !== undefined ? (brandId ? parseInt(brandId, 10) : null) : undefined,
        isFeatured,
        isActive,
    });

    sendSuccess(res, product, 'Product updated successfully');
});

/**
 * Delete product
 * DELETE /api/products/:id
 */
const remove = asyncHandler(async (req, res) => {
    await productService.remove(parseInt(req.params.id, 10));

    sendNoContent(res);
});

/**
 * Add variant to product
 * POST /api/products/:productId/variants
 */
const addVariant = asyncHandler(async (req, res) => {
    const variant = await productService.addVariant(
        parseInt(req.params.productId, 10),
        req.body
    );

    sendCreated(res, variant, 'Variant added successfully');
});

/**
 * Update variant
 * PUT /api/products/variants/:variantId
 */
const updateVariant = asyncHandler(async (req, res) => {
    const variant = await productService.updateVariant(
        parseInt(req.params.variantId, 10),
        req.body
    );

    sendSuccess(res, variant, 'Variant updated successfully');
});

/**
 * Delete variant
 * DELETE /api/products/variants/:variantId
 */
const removeVariant = asyncHandler(async (req, res) => {
    await productService.removeVariant(parseInt(req.params.variantId, 10));

    sendNoContent(res);
});

/**
 * Add image to product
 * POST /api/products/:productId/images
 */
const addImage = asyncHandler(async (req, res) => {
    const { isPrimary, sortOrder, variantId, altText } = req.body;

    if (!req.file) {
        throw new Error('Image file is required');
    }

    const image = await productService.addImage(
        parseInt(req.params.productId, 10),
        {
            url: getFileUrl(req.file.filename),
            altText,
            variantId: variantId ? parseInt(variantId, 10) : null,
            isPrimary: isPrimary === 'true' || isPrimary === true,
            sortOrder: sortOrder ? parseInt(sortOrder, 10) : 0,
        }
    );

    sendCreated(res, image, 'Image added successfully');
});

/**
 * Delete image
 * DELETE /api/products/images/:imageId
 */
const removeImage = asyncHandler(async (req, res) => {
    await productService.removeImage(parseInt(req.params.imageId, 10));

    sendNoContent(res);
});

module.exports = {
    create,
    getAll,
    getById,
    update,
    remove,
    addVariant,
    updateVariant,
    removeVariant,
    addImage,
    removeImage,
};

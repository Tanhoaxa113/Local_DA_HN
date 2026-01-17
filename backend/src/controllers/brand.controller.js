/**
 * Brand Controller
 * Handles HTTP requests for brand endpoints
 */
const brandService = require('../services/brand.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendNoContent } = require('../utils/response');
const { getFileUrl } = require('../config/multer');

/**
 * Create a new brand
 * POST /api/brands
 */
const create = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    const logo = req.file ? getFileUrl(req.file.filename) : null;

    const brand = await brandService.create({
        name,
        description,
        logo,
    });

    sendCreated(res, brand, 'Brand created successfully');
});

/**
 * Get all brands
 * GET /api/brands
 */
const getAll = asyncHandler(async (req, res) => {
    const { activeOnly, includeCount } = req.query;

    const brands = await brandService.getAll({
        activeOnly: activeOnly !== 'false',
        includeCount: includeCount === 'true',
    });

    sendSuccess(res, brands, 'Brands retrieved successfully');
});

/**
 * Get brand by ID or slug
 * GET /api/brands/:idOrSlug
 */
const getById = asyncHandler(async (req, res) => {
    const brand = await brandService.getByIdOrSlug(req.params.idOrSlug);

    sendSuccess(res, brand, 'Brand retrieved successfully');
});

/**
 * Update brand
 * PUT /api/brands/:id
 */
const update = asyncHandler(async (req, res) => {
    const { name, description, isActive } = req.body;

    const logo = req.file ? getFileUrl(req.file.filename) : undefined;

    const brand = await brandService.update(parseInt(req.params.id, 10), {
        name,
        description,
        logo,
        isActive,
    });

    sendSuccess(res, brand, 'Brand updated successfully');
});

/**
 * Delete brand
 * DELETE /api/brands/:id
 */
const remove = asyncHandler(async (req, res) => {
    await brandService.remove(parseInt(req.params.id, 10));

    sendNoContent(res);
});

module.exports = {
    create,
    getAll,
    getById,
    update,
    remove,
};

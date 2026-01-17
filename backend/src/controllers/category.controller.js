/**
 * Category Controller
 * Handles HTTP requests for category endpoints
 */
const categoryService = require('../services/category.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendNoContent } = require('../utils/response');
const { getFileUrl } = require('../config/multer');

/**
 * Create a new category
 * POST /api/categories
 */
const create = asyncHandler(async (req, res) => {
    const { name, description, parentId, sortOrder } = req.body;

    const image = req.file ? getFileUrl(req.file.filename) : null;

    const category = await categoryService.create({
        name,
        description,
        image,
        parentId: parentId ? parseInt(parentId, 10) : null,
        sortOrder: sortOrder ? parseInt(sortOrder, 10) : 0,
    });

    sendCreated(res, category, 'Category created successfully');
});

/**
 * Get all categories
 * GET /api/categories
 */
const getAll = asyncHandler(async (req, res) => {
    const { tree, activeOnly, includeCount } = req.query;

    const categories = await categoryService.getAll({
        tree: tree === 'true',
        activeOnly: activeOnly !== 'false',
        includeCount: includeCount === 'true',
    });

    sendSuccess(res, categories, 'Categories retrieved successfully');
});

/**
 * Get category by ID or slug
 * GET /api/categories/:idOrSlug
 */
const getById = asyncHandler(async (req, res) => {
    const category = await categoryService.getByIdOrSlug(req.params.idOrSlug);

    sendSuccess(res, category, 'Category retrieved successfully');
});

/**
 * Update category
 * PUT /api/categories/:id
 */
const update = asyncHandler(async (req, res) => {
    const { name, description, parentId, sortOrder, isActive } = req.body;

    const image = req.file ? getFileUrl(req.file.filename) : undefined;

    const category = await categoryService.update(parseInt(req.params.id, 10), {
        name,
        description,
        image,
        parentId: parentId !== undefined ? (parentId ? parseInt(parentId, 10) : null) : undefined,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder, 10) : undefined,
        isActive,
    });

    sendSuccess(res, category, 'Category updated successfully');
});

/**
 * Delete category
 * DELETE /api/categories/:id
 */
const remove = asyncHandler(async (req, res) => {
    await categoryService.remove(parseInt(req.params.id, 10));

    sendNoContent(res);
});

module.exports = {
    create,
    getAll,
    getById,
    update,
    remove,
};

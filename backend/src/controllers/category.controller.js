/**
 * Category Controller
 * Điều khiển các request liên quan đến danh mục sản phẩm.
 */
const categoryService = require('../services/category.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendNoContent } = require('../utils/response');
const { getFileUrl } = require('../config/multer');

/**
 * Create a new category
 * Tạo danh mục mới
 * 
 * Chức năng: Thêm một danh mục sản phẩm vào hệ thống.
 * Luồng xử lý:
 * 1. Nhận tên, mô tả... từ body.
 * 2. Nhận file ảnh (nếu có) từ req.file.
 * 3. Gọi `categoryService.create`.
 * 4. Trả về danh mục mới tạo.
 * Kích hoạt khi: Admin thêm danh mục.
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
 * Lấy danh sách danh mục
 * 
 * Chức năng: Lấy cây danh mục hoặc danh sách phẳng.
 * Luồng xử lý:
 * 1. Nhận tham số `tree` (trả về dạng cây cha-con), `activeOnly` (chỉ lấy đang hoạt động), `includeCount` (đếm số SP).
 * 2. Gọi `categoryService.getAll`.
 * 3. Trả về danh sách.
 * Kích hoạt khi: 
 * - Hiển thị menu danh mục trên header (dạng cây).
 * - Admin quản lý danh mục (dạng phẳng).
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
 * Lấy chi tiết danh mục
 * 
 * Chức năng: Xem thông tin chi tiết một danh mục.
 * Luồng xử lý:
 * 1. Lấy ID hoặc Slug từ URL.
 * 2. Gọi `categoryService.getByIdOrSlug`.
 * 3. Trả về object danh mục.
 * Kích hoạt khi: Vào trang chi tiết một danh mục để xem danh sách sản phẩm của nó.
 * GET /api/categories/:idOrSlug
 */
const getById = asyncHandler(async (req, res) => {
    const category = await categoryService.getByIdOrSlug(req.params.idOrSlug);

    sendSuccess(res, category, 'Category retrieved successfully');
});

/**
 * Update category
 * Cập nhật danh mục
 * 
 * Chức năng: Sửa danh mục.
 * Luồng xử lý:
 * 1. Lấy ID từ URL.
 * 2. Nhận dữ liệu và ảnh mới từ request.
 * 3. Gọi `categoryService.update`.
 * 4. Trả về danh mục sau khi sửa.
 * Kích hoạt khi: Admin sửa danh mục.
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
 * Xóa danh mục
 * 
 * Chức năng: Xóa danh mục.
 * Luồng xử lý:
 * 1. Lấy ID từ URL.
 * 2. Gọi `categoryService.remove`.
 *    - Service kiểm tra ràng buộc (có sản phẩm con, danh mục con không...) trước khi xóa.
 * 3. Trả về 204.
 * Kích hoạt khi: Admin xóa danh mục.
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

/**
 * Brand Controller
 * Điều khiển các request liên quan đến thương hiệu sản phẩm.
 */
const brandService = require('../services/brand.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendNoContent } = require('../utils/response');
const { getFileUrl } = require('../config/multer');

/**
 * Create a new brand
 * Tạo thương hiệu mới
 * 
 * Chức năng: Thêm một thương hiệu mới vào hệ thống.
 * Luồng xử lý:
 * 1. Nhận tên, mô tả từ body request.
 * 2. Nhận file ảnh logo từ `req.file` (nếu có) và lấy URL.
 * 3. Gọi service `brandService.create` để tạo bản ghi mới.
 * 4. Trả về thông tin thương hiệu vừa tạo.
 * Kích hoạt khi: Admin vào trang Quản lý thương hiệu và bấm "Thêm mới".
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
 * Lấy danh sách thương hiệu
 * 
 * Chức năng: Lấy danh sách tất cả thương hiệu (có thể lọc).
 * Luồng xử lý:
 * 1. Nhận tham số query `activeOnly` (chỉ lấy thương hiệu đang hoạt động) và `includeCount` (đếm số sản phẩm).
 * 2. Gọi service `brandService.getAll`.
 * 3. Trả về danh sách thương hiệu.
 * Kích hoạt khi: 
 * - Trang chủ hiển thị danh sách đối tác.
 * - Admin vào trang Quản lý thương hiệu.
 * - Form thêm/sửa sản phẩm cần dropdown chọn thương hiệu.
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
 * Lấy chi tiết thương hiệu
 * 
 * Chức năng: Xem thông tin chi tiết của một thương hiệu dựa trên ID hoặc Slug.
 * Luồng xử lý:
 * 1. Lấy tham số `idOrSlug` từ URL.
 * 2. Gọi service `brandService.getByIdOrSlug` để tìm kiếm.
 * 3. Trả về object thương hiệu.
 * Kích hoạt khi: Người dùng truy cập trang danh sách sản phẩm của một thương hiệu cụ thể.
 * GET /api/brands/:idOrSlug
 */
const getById = asyncHandler(async (req, res) => {
    const brand = await brandService.getByIdOrSlug(req.params.idOrSlug);

    sendSuccess(res, brand, 'Brand retrieved successfully');
});

/**
 * Update brand
 * Cập nhật thương hiệu
 * 
 * Chức năng: Sửa thông tin thương hiệu (tên, logo, trạng thái...).
 * Luồng xử lý:
 * 1. Lấy `id` từ URL.
 * 2. Nhận thông tin update từ body và file logo mới (nếu có).
 * 3. Gọi service `brandService.update`.
 * 4. Trả về thương hiệu sau khi update.
 * Kích hoạt khi: Admin sửa thương hiệu.
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
 * Xóa thương hiệu
 * 
 * Chức năng: Xóa thương hiệu khỏi hệ thống.
 * Luồng xử lý:
 * 1. Lấy `id` từ URL.
 * 2. Gọi service `brandService.remove`.
 *    - Logic service sẽ kiểm tra xem có sản phẩm nào đang dùng thương hiệu này không trước khi xóa.
 * 3. Trả về 204 No Content.
 * Kích hoạt khi: Admin nhấn "Xóa" thương hiệu.
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

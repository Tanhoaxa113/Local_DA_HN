/**
 * Address Controller
 * Điều khiển các request liên quan đến địa chỉ giao hàng của người dùng.
 */
const addressService = require('../services/address.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendNoContent } = require('../utils/response');

/**
 * Get current user's addresses
 * Lấy danh sách địa chỉ của người dùng hiện tại
 * 
 * Chức năng: Trả về toàn bộ danh sách địa chỉ giao hàng mà người dùng đã lưu.
 * Luồng xử lý:
 * 1. Lấy `userId` từ token xác thực (req.user.id).
 * 2. Gọi service `addressService.getUserAddresses` để truy vấn DB.
 * 3. Trả về danh sách địa chỉ.
 * Kích hoạt khi: Người dùng truy cập vào trang "Sổ địa chỉ" hoặc ở bước Checkout chọn địa chỉ.
 * GET /api/addresses
 */
const getMyAddresses = asyncHandler(async (req, res) => {
    const addresses = await addressService.getUserAddresses(req.user.id);
    sendSuccess(res, addresses, 'Addresses retrieved');
});

/**
 * Get address by ID
 * Lấy chi tiết một địa chỉ
 * 
 * Chức năng: Xem thông tin chi tiết của một địa chỉ cụ thể.
 * Luồng xử lý:
 * 1. Lấy `id` địa chỉ từ tham số URL (req.params.id).
 * 2. Gọi service `addressService.getById` để tìm địa chỉ.
 *    - Service sẽ kiểm tra xem địa chỉ có thuộc về user hiện tại không.
 * 3. Trả về object địa chỉ.
 * Kích hoạt khi: Người dùng mở form chỉnh sửa một địa chỉ cụ thể.
 * GET /api/addresses/:id
 */
const getById = asyncHandler(async (req, res) => {
    const address = await addressService.getById(
        parseInt(req.params.id, 10),
        req.user.id
    );
    sendSuccess(res, address, 'Address retrieved');
});

/**
 * Create new address
 * Tạo địa chỉ mới
 * 
 * Chức năng: Thêm một địa chỉ giao hàng mới cho người dùng.
 * Luồng xử lý:
 * 1. Nhận thông tin địa chỉ (tên, sđt, địa chỉ, ...) từ body request.
 * 2. Gọi service `addressService.create`.
 * 3. Service lưu vào DB và trả về địa chỉ vừa tạo.
 * Kích hoạt khi: Người dùng điền form "Thêm địa chỉ mới" và bấm Lưu.
 * POST /api/addresses
 */
const create = asyncHandler(async (req, res) => {
    const address = await addressService.create(req.user.id, req.body);
    sendCreated(res, address, 'Address created');
});

/**
 * Update address
 * Cập nhật địa chỉ
 * 
 * Chức năng: Chỉnh sửa thông tin của một địa chỉ đã có.
 * Luồng xử lý:
 * 1. Lấy `id` từ URL và dữ liệu cập nhật từ body.
 * 2. Gọi service `addressService.update`.
 *    - Kiểm tra quyền sở hữu địa chỉ trước khi update.
 * 3. Trả về địa chỉ sau khi cập nhật.
 * Kích hoạt khi: Người dùng sửa địa chỉ và bấm Lưu thay đổi.
 * PUT /api/addresses/:id
 */
const update = asyncHandler(async (req, res) => {
    const address = await addressService.update(
        parseInt(req.params.id, 10),
        req.user.id,
        req.body
    );
    sendSuccess(res, address, 'Address updated');
});

/**
 * Delete address
 * Xóa địa chỉ
 * 
 * Chức năng: Xóa một địa chỉ khỏi danh sách.
 * Luồng xử lý:
 * 1. Lấy `id` từ URL.
 * 2. Gọi service `addressService.remove`.
 *    - Kiểm tra quyền sở hữu.
 *    - Xóa bản ghi trong DB.
 * 3. Trả về 204 No Content.
 * Kích hoạt khi: Người dùng bấm nút "Xóa" trên một địa chỉ.
 * DELETE /api/addresses/:id
 */
const remove = asyncHandler(async (req, res) => {
    await addressService.remove(
        parseInt(req.params.id, 10),
        req.user.id
    );
    sendNoContent(res);
});

/**
 * Set address as default
 * Đặt làm địa chỉ mặc định
 * 
 * Chức năng: Chọn một địa chỉ làm mặc định cho các đơn hàng sau này.
 * Luồng xử lý:
 * 1. Lấy `id` từ URL.
 * 2. Gọi service `addressService.setDefault`.
 *    - Database transaction: Set `isDefault = false` cho tất cả địa chỉ khác của user, set `isDefault = true` cho địa chỉ này.
 * 3. Trả về địa chỉ vừa được set default.
 * Kích hoạt khi: Người dùng bấm "Đặt làm mặc định".
 * POST /api/addresses/:id/default
 */
const setDefault = asyncHandler(async (req, res) => {
    const address = await addressService.setDefault(
        parseInt(req.params.id, 10),
        req.user.id
    );
    sendSuccess(res, address, 'Default address set');
});

module.exports = {
    getMyAddresses,
    getById,
    create,
    update,
    remove,
    setDefault,
};

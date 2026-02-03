/**
 * Address Service
 * Handles address management and location data
 * Quản lý sổ địa chỉ giao hàng của người dùng
 */
const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');

/**
 * Get user's addresses
 * Lấy danh sách địa chỉ của user
 *
 * Chức năng: Lấy tất cả địa chỉ đã lưu của một user.
 * Luồng xử lý:
 * 1. Query bảng Address theo userId.
 * 2. Sắp xếp: Địa chỉ mặc định lên đầu, sau đó đến địa chỉ mới nhất.
 * @param {number} userId - ID người dùng.
 * @returns {Promise<object[]>} Danh sách địa chỉ.
 */
const getUserAddresses = async (userId) => {
    return prisma.address.findMany({
        where: { userId },
        orderBy: [
            { isDefault: 'desc' },
            { createdAt: 'desc' },
        ],
    });
};

/**
 * Get address by ID
 * Lấy chi tiết địa chỉ
 *
 * Chức năng: Lấy thông tin một địa chỉ cụ thể.
 * Luồng xử lý:
 * 1. Tìm địa chỉ trong DB bằng `id`.
 * 2. Nếu có truyền `userId`, kiểm tra thêm điều kiện `userId` (để đảm bảo user chỉ xem được địa chỉ của mình).
 * 3. Nếu không tìm thấy -> Ném lỗi 404.
 * @param {number} id - ID địa chỉ.
 * @param {number} userId - ID người dùng (để kiểm tra quyền sở hữu).
 * @returns {Promise<object>} Địa chỉ.
 */
const getById = async (id, userId = null) => {
    const where = { id };
    if (userId) {
        where.userId = userId;
    }

    const address = await prisma.address.findFirst({
        where,
    });

    if (!address) {
        throw new ApiError(404, 'Address not found');
    }

    return address;
};

/**
 * Create new address
 * Thêm địa chỉ mới
 *
 * Chức năng: User thêm một địa chỉ giao hàng mới.
 * Luồng xử lý:
 * 1. Nếu địa chỉ mới là mặc định (`isDefault = true`):
 *    - Tìm và update tất cả địa chỉ cũ của user thành `isDefault = false` (đảm bảo chỉ có 1 default).
 * 2. Tạo bản ghi Address mới với các thông tin (Tỉnh, Huyện, Xã...).
 * @param {number} userId - ID người dùng.
 * @param {object} data - Dữ liệu địa chỉ.
 * @returns {Promise<object>} Địa chỉ vừa tạo.
 */
const create = async (userId, data) => {
    const { fullName, phone, provinceId, provinceName, wardId, wardName, streetAddress, isDefault } = data;

    // If this should be default, unset other default addresses
    if (isDefault) {
        await prisma.address.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
        });
    }

    const address = await prisma.address.create({
        data: {
            user: { connect: { id: userId } },
            fullName,
            phone,
            provinceId: parseInt(provinceId),
            provinceName,
            wardId: parseInt(wardId),
            wardName,
            streetAddress,
            isDefault: isDefault || false,
        },
    });

    return address;
};

/**
 * Update address
 * Cập nhật địa chỉ
 *
 * Chức năng: Sửa thông tin địa chỉ.
 * Luồng xử lý:
 * 1. Kiểm tra địa chỉ có tồn tại và thuộc về user không.
 * 2. Nếu update thành mặc định (`isDefault = true`):
 *    - Nếu trước đó nó chưa phải là default -> Set các địa chỉ khác thành false.
 * 3. Thực hiện update vào DB với các trường thay đổi (dynamic update).
 * @param {number} id - ID địa chỉ.
 * @param {number} userId - ID người dùng.
 * @param {object} data - Dữ liệu cần sửa.
 * @returns {Promise<object>} Địa chỉ sau khi sửa.
 */
const update = async (id, userId, data) => {
    const { fullName, phone, provinceId, provinceName, wardId, wardName, streetAddress, isDefault } = data;

    const existing = await prisma.address.findFirst({
        where: { id, userId },
    });

    if (!existing) {
        throw new ApiError(404, 'Address not found');
    }

    // If this should be default, unset other default addresses
    if (isDefault && !existing.isDefault) {
        await prisma.address.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
        });
    }

    const address = await prisma.address.update({
        where: { id },
        data: {
            ...(fullName && { fullName }),
            ...(phone && { phone }),
            ...(provinceId && { provinceId: parseInt(provinceId) }),
            ...(provinceName && { provinceName }),
            ...(wardId && { wardId: parseInt(wardId) }),
            ...(wardName && { wardName }),
            ...(streetAddress && { streetAddress }),
            ...(isDefault !== undefined && { isDefault }),
        },
    });

    return address;
};

/**
 * Delete address
 * Xóa địa chỉ
 *
 * Chức năng: User xóa địa chỉ.
 * Luồng xử lý:
 * 1. Kiểm tra địa chỉ có tồn tại và thuộc về user không.
 * 2. Kiểm tra xem địa chỉ này đã từng được dùng trong đơn hàng nào chưa (`orders > 0`).
 *    - Nếu đã dùng -> Không cho xóa (để bảo toàn lịch sử đơn hàng của user và hệ thống).
 *    - Ném lỗi 400 nếu vi phạm.
 * 3. Xóa bản ghi Address.
 * @param {number} id - ID địa chỉ.
 * @param {number} userId - ID người dùng.
 * @returns {Promise<void>}
 */
const remove = async (id, userId) => {
    const address = await prisma.address.findFirst({
        where: { id, userId },
        include: {
            _count: { select: { orders: true } },
        },
    });

    if (!address) {
        throw new ApiError(404, 'Address not found');
    }

    if (address._count.orders > 0) {
        throw new ApiError(400, 'Cannot delete address that has been used in orders');
    }

    await prisma.address.delete({ where: { id } });
};

/**
 * Set address as default
 * Đặt làm địa chỉ mặc định
 *
 * Chức năng: Chọn một địa chỉ làm mặc định.
 * Luồng xử lý:
 * 1. Tìm địa chỉ theo ID.
 * 2. Bỏ cờ `isDefault` của tất cả địa chỉ cũ của user (updateMany).
 * 3. Set `isDefault = true` cho địa chỉ hiện tại.
 * @param {number} id - ID địa chỉ.
 * @param {number} userId - ID người dùng.
 * @returns {Promise<object>} Địa chỉ đã update.
 */
const setDefault = async (id, userId) => {
    const address = await prisma.address.findFirst({
        where: { id, userId },
    });

    if (!address) {
        throw new ApiError(404, 'Address not found');
    }

    // Unset other default addresses
    await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
    });

    // Set this as default
    return prisma.address.update({
        where: { id },
        data: { isDefault: true },
    });
};

/**
 * Format address for display
 * Format địa chỉ hiển thị
 * @param {object} address - Đối tượng địa chỉ.
 * @returns {string} Chuỗi địa chỉ (Số nhà, Phường, Tỉnh).
 */
const formatAddress = (address) => {
    const parts = [
        address.streetAddress,
        address.wardName,
        address.provinceName,
    ].filter(Boolean);

    return parts.join(', ');
};

module.exports = {
    getUserAddresses,
    getById,
    create,
    update,
    remove,
    setDefault,
    formatAddress,
};

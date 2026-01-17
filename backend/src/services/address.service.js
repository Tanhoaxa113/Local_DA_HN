/**
 * Address Service
 * Handles address management and location data
 */
const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');

/**
 * Get user's addresses
 * @param {number} userId - User ID
 * @returns {Promise<object[]>} List of addresses
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
 * @param {number} id - Address ID
 * @param {number} userId - User ID (for ownership check)
 * @returns {Promise<object>} Address
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
 * @param {number} userId - User ID
 * @param {object} data - Address data
 * @returns {Promise<object>} Created address
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
 * @param {number} id - Address ID
 * @param {number} userId - User ID
 * @param {object} data - Update data
 * @returns {Promise<object>} Updated address
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
 * @param {number} id - Address ID
 * @param {number} userId - User ID
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
 * @param {number} id - Address ID
 * @param {number} userId - User ID
 * @returns {Promise<object>} Updated address
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
 * @param {object} address - Address object
 * @returns {string} Formatted address
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

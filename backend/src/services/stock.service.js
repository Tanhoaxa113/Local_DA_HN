/**
 * Stock Service
 * Handles stock locking and management with Redis for concurrency control
 * Quản lý kho hàng và khóa giữ hàng (Distributed Lock với Redis)
 */
const prisma = require('../config/database');
const { redis, redisUtils } = require('../config/redis');
const config = require('../config');
const ApiError = require('../utils/ApiError');

/**
 * Lock stock for order items
 * Khóa giữ hàng cho đơn
 *
 * Chức năng: Giữ hàng tạm thời khi user đặt đơn nhưng chưa thanh toán/hoàn tất.
 * Luồng xử lý (Concurrency Control):
 * 1. Duyệt qua từng item:
 *    - Lấy khóa phân tán từ Redis (`SETNX`) với TTL ngắn hạn.
 *    - Nếu không lấy được khóa -> Báo lỗi "Hàng đang được xử lý".
 *    - Kiểm tra `availableStock` trong DB.
 * 2. Nếu tất cả OK -> Start Transaction DB:
 *    - Trừ `availableStock`.
 *    - Tạo record `StockLock` để theo dõi.
 * 3. Nếu có lỗi -> Rollback (Release Redis Lock).
 * @param {object[]} items - Danh sách item { variantId, quantity }.
 * @param {number} orderId - ID đơn hàng (có thể null).
 * @param {number} ttlMinutes - Thời gian giữ lock.
 * @returns {Promise<object>} Kết quả lock.
 */
const lockStock = async (items, orderId = null, ttlMinutes = null) => {
    const lockTtl = (ttlMinutes || config.stockLock.ttlMinutes) * 60; // Convert to seconds
    const locks = [];
    const lockedVariants = [];

    try {
        // Acquire locks for all items atomically
        for (const item of items) {
            const lockKey = `lock_stock_${item.variantId}_${orderId || Date.now()}`;

            // Use Redis transaction for atomic check-and-set
            const variant = await prisma.productVariant.findUnique({
                where: { id: item.variantId },
            });

            if (!variant) {
                throw new ApiError(404, `Variant ${item.variantId} not found`);
            }

            if (!variant.isActive) {
                throw new ApiError(400, `Variant ${item.variantId} is not available`);
            }

            if (variant.availableStock < item.quantity) {
                throw new ApiError(400, `Insufficient stock for variant ${item.variantId}. Available: ${variant.availableStock}, Requested: ${item.quantity}`);
            }

            // Try to acquire Redis lock
            const lockValue = JSON.stringify({
                orderId,
                variantId: item.variantId,
                quantity: item.quantity,
                lockedAt: Date.now(),
            });

            const result = await redis.set(lockKey, lockValue, 'EX', lockTtl, 'NX');

            if (result !== 'OK') {
                throw new ApiError(409, `Stock for variant ${item.variantId} is currently being processed. Please try again.`);
            }

            locks.push({
                key: lockKey,
                variantId: item.variantId,
                quantity: item.quantity,
            });

            lockedVariants.push({
                variantId: item.variantId,
                quantity: item.quantity,
            });
        }

        // All locks acquired, now update database in transaction
        await prisma.$transaction(async (tx) => {
            for (const item of items) {
                // Decrement available stock
                await tx.productVariant.update({
                    where: { id: item.variantId },
                    data: {
                        availableStock: {
                            decrement: item.quantity,
                        },
                    },
                });

                // Record lock in database for tracking
                if (orderId) {
                    const lockKey = locks.find(l => l.variantId === item.variantId).key;
                    await tx.stockLock.create({
                        data: {
                            variantId: item.variantId,
                            orderId,
                            quantity: item.quantity,
                            lockKey,
                            expiresAt: new Date(Date.now() + lockTtl * 1000),
                        },
                    });
                }
            }
        });

        return {
            success: true,
            locks,
            expiresAt: new Date(Date.now() + lockTtl * 1000),
        };
    } catch (error) {
        // Rollback: release any acquired locks
        for (const lock of locks) {
            await redis.del(lock.key);
        }

        throw error;
    }
};

/**
 * Release stock locks (return available stock)
 * Giải phóng hàng giữ
 *
 * Chức năng: Trả lại hàng vào kho `Available` (Khi hủy đơn hoặc hết hạn thanh toán).
 * Luồng xử lý:
 * 1. Lấy danh sách Lock của Order.
 * 2. Cộng lại `availableStock` vào biến thể.
 * 3. Xóa Lock trong DB và Redis.
 * @param {number} orderId - ID đơn hàng.
 * @returns {Promise<object>} Kết quả release.
 */
const releaseStock = async (orderId) => {
    // Get all locks for this order
    const stockLocks = await prisma.stockLock.findMany({
        where: { orderId },
    });

    if (stockLocks.length === 0) {
        return { success: true, released: 0 };
    }

    // Release in transaction
    await prisma.$transaction(async (tx) => {
        for (const lock of stockLocks) {
            // Increment available stock
            await tx.productVariant.update({
                where: { id: lock.variantId },
                data: {
                    availableStock: {
                        increment: lock.quantity,
                    },
                },
            });

            // Delete Redis lock
            await redis.del(lock.lockKey);
        }

        // Delete all stock lock records
        await tx.stockLock.deleteMany({
            where: { orderId },
        });
    });

    return {
        success: true,
        released: stockLocks.length,
    };
};

/**
 * Confirm stock (deduct from physical stock when order is being prepared)
 * Xác nhận trừ kho vật lý
 *
 * Chức năng: Khi đơn hàng được xác nhận và chuyển sang trạng thái chuẩn bị (PREPARING).
 * Luồng xử lý:
 * 1. Trừ `stock` (Kho vật lý). `availableStock` đã bị trừ lúc Lock rồi nên ko cần trừ nữa.
 * 2. Xóa các Lock liên quan (Vì giờ hàng đã chính thức bay màu khỏi kho).
 * @param {number} orderId - ID đơn hàng.
 * @returns {Promise<object>} Kết quả confirm.
 */
const confirmStock = async (orderId) => {
    // Get order items
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            items: true,
        },
    });

    if (!order) {
        throw new ApiError(404, 'Order not found');
    }

    // Deduct from physical stock in transaction
    await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
            const variant = await tx.productVariant.findUnique({
                where: { id: item.variantId },
            });

            if (variant.stock < item.quantity) {
                throw new ApiError(400, `Insufficient physical stock for ${item.productName}. Available: ${variant.stock}`);
            }

            await tx.productVariant.update({
                where: { id: item.variantId },
                data: {
                    stock: {
                        decrement: item.quantity,
                    },
                },
            });
        }

        // Clean up stock locks
        await tx.stockLock.deleteMany({
            where: { orderId },
        });
    });

    // Clean up Redis locks
    const stockLocks = await prisma.stockLock.findMany({
        where: { orderId },
    });

    for (const lock of stockLocks) {
        await redis.del(lock.lockKey);
    }

    return { success: true };
};

/**
 * Return stock to warehouse (both physical and available)
 * Hoàn trả hàng vào kho
 *
 * Chức năng: Khi khách trả hàng (Return).
 * @param {number} orderId - ID đơn hàng.
 * @returns {Promise<object>} Kết quả hoàn trả.
 */
const returnStock = async (orderId) => {
    // Get order items
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            items: true,
        },
    });

    if (!order) {
        throw new ApiError(404, 'Order not found');
    }

    // Add back to both stock and available stock
    await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
            await tx.productVariant.update({
                where: { id: item.variantId },
                data: {
                    stock: {
                        increment: item.quantity,
                    },
                    availableStock: {
                        increment: item.quantity,
                    },
                },
            });
        }
    });

    return { success: true };
};

/**
 * Clean up expired stock locks
 * Dọn dẹp Lock hết hạn
 *
 * Chức năng: Cronjob chạy định kỳ để giải phóng hàng bị giữ bởi các đơn treo quá lâu.
 * @returns {Promise<object>} Số lượng lock đã dọn.
 */
const cleanupExpiredLocks = async () => {
    const expiredLocks = await prisma.stockLock.findMany({
        where: {
            expiresAt: { lt: new Date() },
        },
    });

    if (expiredLocks.length === 0) {
        return { cleaned: 0 };
    }

    // Group by order
    const orderIds = [...new Set(expiredLocks.map(l => l.orderId).filter(Boolean))];

    for (const orderId of orderIds) {
        await releaseStock(orderId);
    }

    return { cleaned: orderIds.length };
};

/**
 * Get low stock variants
 * Lấy danh sách sắp hết hàng
 *
 * Chức năng: Cảnh báo kho.
 * @returns {Promise<object[]>} Danh sách variant.
 */
const getLowStockVariants = async () => {
    const variants = await prisma.productVariant.findMany({
        where: {
            isActive: true,
            stock: {
                lte: prisma.productVariant.fields.lowStockThreshold,
            },
        },
        include: {
            product: {
                select: { id: true, name: true, slug: true },
            },
        },
        orderBy: { stock: 'asc' },
    });

    return variants;
};

/**
 * Adjust stock manually (for inventory management)
 * Cập nhật kho thủ công
 *
 * Chức năng: Admin điều chỉnh kho (nhập hàng thêm, kiểm kê...).
 * @param {number} variantId - ID biến thể.
 * @param {number} adjustment - Số lượng điều chỉnh (+ hoặc -).
 * @param {string} reason - Lý do.
 * @returns {Promise<object>} Variant đã update.
 */
const adjustStock = async (variantId, adjustment, reason = '') => {
    const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
    });

    if (!variant) {
        throw new ApiError(404, 'Variant not found');
    }

    const newStock = variant.stock + adjustment;
    const newAvailableStock = variant.availableStock + adjustment;

    if (newStock < 0 || newAvailableStock < 0) {
        throw new ApiError(400, 'Adjustment would result in negative stock');
    }

    const updated = await prisma.productVariant.update({
        where: { id: variantId },
        data: {
            stock: newStock,
            availableStock: newAvailableStock,
        },
    });

    // TODO: Log stock adjustment for audit trail

    return updated;
};

module.exports = {
    lockStock,
    releaseStock,
    confirmStock,
    returnStock,
    cleanupExpiredLocks,
    getLowStockVariants,
    adjustStock,
};

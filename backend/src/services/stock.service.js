/**
 * Stock Service
 * Handles stock locking and management with Redis for concurrency control
 */
const prisma = require('../config/database');
const { redis, redisUtils } = require('../config/redis');
const config = require('../config');
const ApiError = require('../utils/ApiError');

/**
 * Lock stock for order items
 * Uses Redis SETNX for distributed locking and DB transaction for atomic updates
 * @param {object[]} items - Array of { variantId, quantity }
 * @param {number} orderId - Order ID (optional, for tracking)
 * @param {number} ttlMinutes - Lock TTL in minutes
 * @returns {Promise<object>} Lock result with lock keys
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
 * Called when order is cancelled or payment times out
 * @param {number} orderId - Order ID
 * @returns {Promise<object>} Release result
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
 * Called when order status changes to PREPARING
 * @param {number} orderId - Order ID
 * @returns {Promise<object>} Confirmation result
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
 * Called when order is returned to warehouse
 * @param {number} orderId - Order ID
 * @returns {Promise<object>} Return result
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
 * Called by cronjob to release locks for timed-out orders
 * @returns {Promise<object>} Cleanup result
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
 * @returns {Promise<object[]>} Variants with stock <= threshold
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
 * @param {number} variantId - Variant ID
 * @param {number} adjustment - Stock adjustment (positive to add, negative to subtract)
 * @param {string} reason - Reason for adjustment
 * @returns {Promise<object>} Updated variant
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

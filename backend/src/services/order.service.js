/**
 * Order Service
 * Handles order creation, management, and status transitions
 */
const prisma = require('../config/database');
const config = require('../config');
const ApiError = require('../utils/ApiError');
const stockService = require('./stock.service');
const cartService = require('./cart.service');
const {
    OrderStatus,
    validateTransition,
    getValidNextStatuses,
    shouldReleaseStock,
    shouldConfirmStock,
    shouldReturnStock,
    shouldAwardPoints,
    isCancellable,
} = require('../utils/orderStateMachine');

/**
 * Generate unique order number
 * Format: YYYYMMDD-XXXXX (e.g., 20260115-00001)
 * @returns {Promise<string>} Unique order number
 */
const generateOrderNumber = async () => {
    const today = new Date();
    const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Get today's order count
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const count = await prisma.order.count({
        where: {
            createdAt: {
                gte: startOfDay,
                lte: endOfDay,
            },
        },
    });

    const sequence = String(count + 1).padStart(5, '0');
    return `${datePrefix}-${sequence}`;
};

/**
 * Create a new order from cart
 * @param {number} userId - User ID
 * @param {object} orderData - Order data
 * @returns {Promise<object>} Created order
 */
const createFromCart = async (userId, orderData) => {
    const { addressId, paymentMethod, note } = orderData;

    // Validate cart
    const validation = await cartService.validateForCheckout(userId);
    if (!validation.valid) {
        throw new ApiError(400, 'Cart validation failed', validation.issues);
    }

    const cart = validation.cart;

    // Validate address belongs to user
    const address = await prisma.address.findFirst({
        where: { id: addressId, userId },
    });

    if (!address) {
        throw new ApiError(404, 'Shipping address not found');
    }

    // Get user with tier info
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { tier: true },
    });

    // Calculate order totals
    const subtotal = cart.subtotal;
    const shippingMethod = orderData.shippingMethod || 'standard';
    const shippingFee = calculateShippingFee(subtotal, shippingMethod);

    // Apply tier discount using lazy reset logic
    const loyaltyService = require('./loyalty.service');
    let loyaltyDiscount = 0; // Tier member discount amount
    let tierDiscountApplied = false;

    const discountEligibility = await loyaltyService.checkDiscountEligibility(userId);
    if (discountEligibility.eligible && discountEligibility.discountPercent > 0) {
        loyaltyDiscount = Math.floor((subtotal * discountEligibility.discountPercent) / 100);
        tierDiscountApplied = true;
    }

    // Total discount (tier discount + promo codes if any)
    const discountAmount = loyaltyDiscount;
    const totalAmount = subtotal + shippingFee - discountAmount;

    // Generate order number
    const orderNumber = await generateOrderNumber();

    // Prepare items for stock locking
    const stockItems = cart.items.map((item) => ({
        variantId: item.variant.id,
        quantity: item.quantity,
    }));

    // Create order in transaction with stock locking
    const order = await prisma.$transaction(async (tx) => {
        // Create order first
        const newOrder = await tx.order.create({
            data: {
                orderNumber,
                userId,
                addressId,
                paymentMethod,
                shippingMethod,
                status: OrderStatus.PENDING_PAYMENT,
                paymentStatus: paymentMethod === 'COD' ? 'UNPAID' : 'PENDING',
                subtotal,
                shippingFee,
                discountAmount,
                loyaltyDiscount,
                totalAmount,
                note,
                lockedUntil: new Date(Date.now() + config.order.paymentTimeoutMinutes * 60 * 1000),
            },
        });

        // Create order items
        const orderItems = cart.items.map((item) => ({
            orderId: newOrder.id,
            variantId: item.variant.id,
            productName: item.product.name,
            variantInfo: `Size: ${item.variant.size}, Color: ${item.variant.color}`,
            sku: item.variant.sku,
            quantity: item.quantity,
            unitPrice: item.variant.price,
            totalPrice: item.quantity * Number(item.variant.price),
        }));

        await tx.orderItem.createMany({ data: orderItems });

        // Update product totalSold
        for (const item of cart.items) {
            await tx.product.update({
                where: { id: item.product.id },
                data: { totalSold: { increment: item.quantity } }
            });
        }

        // Create initial status history
        await tx.orderStatusHistory.create({
            data: {
                orderId: newOrder.id,
                fromStatus: null,
                toStatus: OrderStatus.PENDING_PAYMENT,
                note: 'Order created',
                changedBy: userId,
            },
        });

        return newOrder;
    });

    // Lock stock after order creation
    await stockService.lockStock(stockItems, order.id);

    // Clear cart after successful order
    await cartService.clearCart(userId);

    // Record tier discount usage if applied
    if (tierDiscountApplied) {
        await loyaltyService.recordDiscountUsage(userId);
    }

    // If COD, move to pending confirmation
    if (paymentMethod === 'COD') {
        await updateStatus(order.id, OrderStatus.PENDING_CONFIRMATION, null, 'COD order - awaiting confirmation');
    }

    // Emit real-time events for new order
    try {
        const socket = require('../socket');

        // Notify admins about new order
        socket.emitToAdmin('order_created', {
            orderId: order.id,
            orderNumber,
            userId,
            paymentMethod,
            totalAmount,
            status: paymentMethod === 'COD' ? OrderStatus.PENDING_CONFIRMATION : OrderStatus.PENDING_PAYMENT,
            createdAt: new Date(),
        });

        // Notify user about successful order creation
        socket.emitToUser(userId, 'order_created', {
            orderId: order.id,
            orderNumber,
            totalAmount,
            paymentMethod,
            lockedUntil: order.lockedUntil,
            createdAt: new Date(),
        });
    } catch (socketError) {
        // Socket errors shouldn't break order creation
        console.error('[Order] Socket emission failed:', socketError.message);
    }

    return getById(order.id);
};

/**
 * Get order by ID
 * @param {number} id - Order ID
 * @param {number} userId - User ID (optional, for ownership check)
 * @returns {Promise<object>} Order with details
 */
const getById = async (id, userId = null) => {
    const where = { id };
    if (userId) {
        where.userId = userId;
    }

    const order = await prisma.order.findFirst({
        where,
        include: {
            user: {
                select: { id: true, fullName: true, email: true, phone: true },
            },
            address: true,
            items: {
                include: {
                    variant: {
                        include: {
                            product: {
                                include: {
                                    images: {
                                        orderBy: [
                                            { isPrimary: 'desc' },
                                            { sortOrder: 'asc' }
                                        ],
                                        take: 1,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            payment: true,
            statusHistory: {
                orderBy: { createdAt: 'desc' },
            },
        },
    });

    if (!order) {
        throw new ApiError(404, 'Order not found');
    }

    return order;
};

/**
 * Get order by order number
 * @param {string} orderNumber - Order number
 * @param {number} userId - User ID (optional, for ownership check)
 * @returns {Promise<object>} Order with details
 */
const getByOrderNumber = async (orderNumber, userId = null) => {
    const where = { orderNumber };
    if (userId) {
        where.userId = userId;
    }

    const order = await prisma.order.findFirst({
        where,
        include: {
            user: {
                select: { id: true, fullName: true, email: true, phone: true },
            },
            address: true,
            items: {
                include: {
                    variant: {
                        include: {
                            product: {
                                include: {
                                    images: {
                                        orderBy: [
                                            { isPrimary: 'desc' },
                                            { sortOrder: 'asc' }
                                        ],
                                        take: 1,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            payment: true,
            statusHistory: {
                orderBy: { createdAt: 'desc' },
            },
        },
    });

    if (!order) {
        throw new ApiError(404, 'Order not found');
    }

    return order;
};

/**
 * Get orders with filtering and pagination
 * @param {object} options - Query options
 * @returns {Promise<object>} Paginated orders
 */
const getAll = async (options = {}) => {
    const {
        page = 1,
        limit = 10,
        userId,
        status,
        paymentStatus,
        paymentMethod,
        startDate,
        endDate,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
    } = options;

    // Parse pagination params as integers (they come as strings from query params)
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    const where = {};

    if (userId) {
        where.userId = parseInt(userId, 10);
    }

    if (status) {
        where.status = status;
    }

    if (paymentStatus) {
        where.paymentStatus = paymentStatus;
    }

    if (paymentMethod) {
        where.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search) {
        where.OR = [
            { orderNumber: { contains: search } },
            { user: { fullName: { contains: search } } },
            { user: { email: { contains: search } } },
        ];
    }

    const total = await prisma.order.count({ where });

    const orders = await prisma.order.findMany({
        where,
        include: {
            user: {
                select: { id: true, fullName: true, email: true },
            },
            items: {
                take: 3,
                include: {
                    variant: {
                        include: {
                            product: {
                                include: {
                                    images: {
                                        orderBy: [
                                            { isPrimary: 'desc' },
                                            { sortOrder: 'asc' }
                                        ],
                                        take: 1,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            _count: { select: { items: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
    });

    return {
        data: orders,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
            hasMore: pageNum * limitNum < total,
        },
    };
};

/**
 * Update order status with state machine validation
 * @param {number} orderId - Order ID
 * @param {string} newStatus - New status
 * @param {number} changedBy - User ID making the change
 * @param {string} note - Optional note
 * @param {string} userRole - Role of user making the change
 * @returns {Promise<object>} Updated order
 */
const updateStatus = async (orderId, newStatus, changedBy = null, note = '', userRole = 'SYSTEM') => {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
    });

    if (!order) {
        throw new ApiError(404, 'Order not found');
    }

    // Validate transition
    validateTransition(order.status, newStatus, userRole);

    // Handle side effects based on new status
    let updateData = {
        status: newStatus,
    };

    // Stock operations
    if (shouldReleaseStock(newStatus)) {
        await stockService.releaseStock(orderId);
    }

    if (shouldConfirmStock(newStatus)) {
        await stockService.confirmStock(orderId);
    }

    if (shouldReturnStock(newStatus)) {
        await stockService.returnStock(orderId);
    }

    // Award loyalty points
    if (shouldAwardPoints(newStatus)) {
        await awardLoyaltyPoints(orderId);
        updateData.completedAt = new Date();
    }

    // Set timestamps based on status
    switch (newStatus) {
        case OrderStatus.PENDING_CONFIRMATION:
            // Clear lock since payment is done or COD confirmed
            updateData.lockedUntil = null;
            break;
        case OrderStatus.PREPARING:
            updateData.confirmedAt = new Date();
            break;
        case OrderStatus.IN_TRANSIT:
            updateData.shippedAt = new Date();
            break;
        case OrderStatus.DELIVERED:
            updateData.deliveredAt = new Date();
            break;
        case OrderStatus.CANCELLED:
            updateData.cancelledAt = new Date();
            break;
    }

    // Update order and create status history
    await prisma.$transaction([
        prisma.order.update({
            where: { id: orderId },
            data: updateData,
        }),
        prisma.orderStatusHistory.create({
            data: {
                orderId,
                fromStatus: order.status,
                toStatus: newStatus,
                note,
                changedBy,
            },
        }),
    ]);

    const updatedOrder = await getById(orderId);

    // Emit real-time events
    const socket = require('../socket'); // Lazy load to avoid circular dependency

    // Notify user
    socket.emitToUser(order.userId, 'order_status_updated', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        oldStatus: order.status,
        newStatus: newStatus,
        updatedAt: new Date(),
    });

    // Notify admins
    socket.emitToAdmin('admin_order_updated', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        oldStatus: order.status,
        newStatus: newStatus,
        totalAmount: order.totalAmount,
        updatedAt: new Date(),
    });

    return updatedOrder;
};

/**
 * Cancel order
 * @param {number} orderId - Order ID
 * @param {number} userId - User ID requesting cancellation
 * @param {string} reason - Cancellation reason
 * @param {string} userRole - User role
 * @returns {Promise<object>} Cancelled order
 */
const cancel = async (orderId, userId, reason = '', userRole = 'CUSTOMER') => {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
    });

    if (!order) {
        throw new ApiError(404, 'Order not found');
    }

    // Check ownership for customers
    if (userRole === 'CUSTOMER' && order.userId !== userId) {
        throw new ApiError(403, 'You can only cancel your own orders');
    }

    if (!isCancellable(order.status)) {
        throw new ApiError(400, 'This order cannot be cancelled');
    }

    await prisma.order.update({
        where: { id: orderId },
        data: { cancelReason: reason },
    });

    return updateStatus(orderId, OrderStatus.CANCELLED, userId, reason, userRole);
};

/**
 * Request refund for delivered order
 * @param {number} orderId - Order ID
 * @param {number} userId - User ID requesting refund
 * @param {string} reason - Refund reason
 * @returns {Promise<object>} Updated order
 */
const requestRefund = async (orderId, userId, reason) => {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
    });

    if (!order) {
        throw new ApiError(404, 'Order not found');
    }

    if (order.userId !== userId) {
        throw new ApiError(403, 'You can only request refund for your own orders');
    }

    if (order.status !== OrderStatus.DELIVERED) {
        throw new ApiError(400, 'Refund can only be requested for delivered orders');
    }

    return updateStatus(orderId, OrderStatus.REFUND_REQUESTED, userId, reason, 'CUSTOMER');
};

/**
 * Award loyalty points for completed order
 * @param {number} orderId - Order ID
 */
const awardLoyaltyPoints = async (orderId) => {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: { include: { tier: true } } },
    });

    if (!order) return;

    // Calculate points based on order total and tier multiplier
    const basePoints = Math.floor(Number(order.totalAmount) / config.loyalty.pointsPerAmount);
    const multiplier = Number(order.user.tier?.pointMultiplier) || 1;
    const pointsEarned = Math.floor(basePoints * multiplier);

    // Update user points and order
    await prisma.$transaction([
        prisma.user.update({
            where: { id: order.userId },
            data: {
                loyaltyPoints: { increment: pointsEarned },
            },
        }),
        prisma.order.update({
            where: { id: orderId },
            data: { loyaltyPointsEarned: pointsEarned },
        }),
    ]);

    // Check for tier upgrade
    const loyaltyService = require('./loyalty.service');
    await loyaltyService.checkTierUpgrade(order.userId);
};


/**
 * Calculate shipping fee
 * @param {number} subtotal - Order subtotal
 * @param {string} shippingMethod - Shipping method (standard/express)
 * @returns {number} Shipping fee
 */
const calculateShippingFee = (subtotal, shippingMethod = 'standard') => {
    if (shippingMethod === 'express') {
        return 30000;
    }
    // Free shipping for all other cases (standard)
    return 0;
};

/**
 * Get valid next statuses for an order
 * @param {number} orderId - Order ID
 * @param {string} userRole - User role
 * @returns {Promise<object[]>} Valid next statuses
 */
const getNextStatuses = async (orderId, userRole) => {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
    });

    if (!order) {
        throw new ApiError(404, 'Order not found');
    }

    return getValidNextStatuses(order.status, userRole);
};

const autoConfirmRefunds = async () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    try {
        const staleRefunds = await prisma.order.findMany({
            where: {
                status: OrderStatus.REFUNDED,
                updatedAt: {
                    lte: threeDaysAgo,
                },
            },
        });

        console.log(`[Cron] Found ${staleRefunds.length} orders to auto-confirm refund.`);

        for (const order of staleRefunds) {
            try {
                await updateStatus(
                    order.id,
                    OrderStatus.REFUND_CONFIRMED,
                    null,
                    'Hệ thống tự động xác nhận sau 3 ngày hoàn tiền',
                    'SYSTEM'
                );
            } catch (err) {
                console.error(`[Cron] Failed to auto-confirm refund for order ${order.orderNumber}:`, err.message);
            }
        }
    } catch (error) {
        console.error('[Cron] Error in autoConfirmRefunds:', error);
    }
};

module.exports = {
    createFromCart,
    getById,
    getByOrderNumber,
    getAll,
    updateStatus,
    cancel,
    requestRefund,
    getNextStatuses,
    generateOrderNumber,
    calculateShippingFee,
    autoConfirmRefunds,
};

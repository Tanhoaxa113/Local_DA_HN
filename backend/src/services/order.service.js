/**
 * Order Service
 * Xử lý tạo đơn hàng, quản lý và chuyển đổi trạng thái
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
 * Tạo mã đơn hàng duy nhất
 *
 * Chức năng: Tạo mã đơn hàng theo định dạng ngày tháng + số thứ tự.
 * Format: YYYYMMDD-XXXXX (Ví dụ: 20260115-00001).
 * Luồng xử lý:
 * 1. Lấy ngày hiện tại làm prefix.
 * 2. Đếm số đơn hàng đã tạo trong ngày.
 * 3. Cộng thêm 1 và padding số 0 để đủ 5 chữ số.
 * @returns {Promise<string>} Mã đơn hàng.
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
 * Tạo đơn hàng từ giỏ hàng
 *
 * Chức năng: Chuyển đổi giỏ hàng hiện tại của user thành đơn hàng mới.
 * Luồng xử lý:
 * 1. Validate giỏ hàng (kiểm tra tồn kho, giá cả...).
 * 2. Kiểm tra tính hợp lệ của địa chỉ giao hàng.
 * 3. Lấy thông tin User và hạng thành viên (Tier) để tính giảm giá.
 * 4. Tính toán tổng tiền: Subtotal + Ship - Discount.
 * 5. Tạo mã đơn hàng.
 * 6. Dùng Transaction (`prisma.$transaction`) để:
 *    - Tạo record Order.
 *    - Tạo các OrderItem.
 *    - Cập nhật số lượng đã bán (`totalSold`) của sản phẩm.
 *    - Tạo lịch sử trạng thái (`OrderStatusHistory`).
 * 7. Khóa tồn kho (`stockService.lockStock`).
 * 8. Xóa giỏ hàng.
 * 9. Ghi nhận lượt dùng ưu đãi thành viên (nếu có).
 * 10. Gửi thông báo Socket cho Admin và User.
 * @param {number} userId - ID người dùng.
 * @param {object} orderData - Dữ liệu đơn hàng (địa chỉ, phương thức thanh toán...).
 * @returns {Promise<object>} Đơn hàng vừa tạo.
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
 * Lấy chi tiết đơn hàng
 *
 * Chức năng: Lấy thông tin đầy đủ của đơn hàng.
 * @param {number} id - Order ID.
 * @param {number} userId - ID user (để kiểm tra quyền sở hữu nếu cần).
 * @returns {Promise<object>} Đơn hàng kèm Items, Payment, History.
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
 * Lấy đơn hàng theo mã
 *
 * Chức năng: Tìm đơn hàng bằng mã đơn (ví dụ: 20240101-00001).
 * @param {string} orderNumber - Mã đơn hàng.
 * @param {number} userId - ID user.
 * @returns {Promise<object>} Đơn hàng.
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
 * Lấy danh sách đơn hàng
 *
 * Chức năng: Lấy danh sách đơn hàng cho Admin hoặc User (Lịch sử mua hàng).
 * Luồng xử lý:
 * 1. Xây dựng điều kiện lọc (User, Status, Date...).
 * 2. Phân trang.
 * 3. Trả về danh sách kèm items tóm tắt (3 items đầu).
 * @param {object} options - Các tùy chọn lọc.
 * @returns {Promise<object>} Danh sách phân trang.
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
 * Cập nhật trạng thái đơn hàng
 *
 * Chức năng: Chuyển đổi trạng thái đơn hàng (duyệt, giao, hủy...) an toàn.
 * Luồng xử lý:
 * 1. Kiểm tra đơn tồn tại.
 * 2. `validateTransition`: Kiểm tra xem từ trạng thái cũ sang mới có hợp lệ không (dựa trên Rules).
 * 3. Xử lý logic phụ (Side effects):
 *    - `shouldReleaseStock`: Nếu hủy/hết hạn -> Nhả tồn kho.
 *    - `shouldConfirmStock`: Nếu xác nhận đơn -> Trừ tồn kho thật.
 *    - `shouldReturnStock`: Nếu hoàn trả -> Cộng lại tồn kho.
 *    - `shouldAwardPoints`: Nếu hoàn thành -> Cộng điểm tích lũy.
 * 4. Cập nhật các mốc thời gian (ShippedAt, DeliveredAt...).
 * 5. Update DB và ghi log StatusHistory.
 * 6. Bắn Socket thông báo real-time.
 * @param {number} orderId - ID đơn hàng.
 * @param {string} newStatus - Trạng thái mới.
 * @param {number} changedBy - ID người thực hiện.
 * @param {string} note - Ghi chú.
 * @param {string} userRole - Vai trò người thực hiện (để check quyền).
 * @returns {Promise<object>} Đơn hàng đã update.
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
 * Hủy đơn hàng
 *
 * Chức năng: User hoặc Admin hủy đơn.
 * Luồng xử lý:
 * 1. Kiểm tra đơn.
 * 2. Kiểm tra quyền sở hữu (nếu là Customer).
 * 3. Kiểm tra xem trạng thái hiện tại có cho phép hủy không (`isCancellable`).
 * 4. Gọi `updateStatus` để chuyển sang CANCELLED (logic nhả kho sẽ chạy trong đó).
 * @param {number} orderId - ID đơn hàng.
 * @param {number} userId - ID người yêu cầu.
 * @param {string} reason - Lý do hủy.
 * @param {string} userRole - Vai trò.
 * @returns {Promise<object>} Đơn hàng đã hủy.
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
 * Yêu cầu hoàn tiền
 *
 * Chức năng: User yêu cầu hoàn tiền sau khi nhận hàng.
 * @param {number} orderId - Order ID.
 * @param {number} userId - User ID.
 * @param {string} reason - Lý do.
 * @returns {Promise<object>} Đơn hàng.
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
 * Cộng điểm tích lũy
 *
 * Chức năng: Tính và cộng điểm cho user khi đơn hoàn thành.
 * Luồng xử lý:
 * 1. Tính điểm cơ bản: Total / Tỷ lệ đổi điểm.
 * 2. Nhân hệ số theo Rank thành viên.
 * 3. Update User (cộng điểm) và Order (ghi nhận điểm đã cộng).
 * 4. Kiểm tra xem có đủ điểm lên hạng không (`checkTierUpgrade`).
 * @param {number} orderId - Order ID.
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
 * Tính phí ship
 * @param {number} subtotal - Tổng tiền hàng.
 * @param {string} shippingMethod - Phương thức vận chuyển.
 * @returns {number} Phí ship.
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
 * Lấy các trạng thái tiếp theo hợp lệ
 *
 * Chức năng: Helper cho FE biết có thể chuyển đơn sang trạng thái nào tiếp theo.
 * @param {number} orderId - Order ID.
 * @param {string} userRole - User Role.
 * @returns {Promise<object[]>} Danh sách trạng thái.
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

/**
 * Auto confirm refunds
 * Tự động xác nhận hoàn tiền
 *
 * Chức năng: Cron job, chạy định kỳ.
 * Logic: Tìm các đơn đã hoàn tiền (Refunded) quá 3 ngày mà chưa xác nhận -> Tự động xác nhận.
 */
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

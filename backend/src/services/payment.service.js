/**
 * Payment Service
 * Handles payment operations and integrates with payment gateways
 * Xử lý thanh toán và tích hợp cổng thanh toán (VNPAY)
 */
const prisma = require('../config/database');
const config = require('../config');
const ApiError = require('../utils/ApiError');
const vnpayService = require('./vnpay.service');
const orderService = require('./order.service');
const { OrderStatus } = require('../utils/orderStateMachine');

/**
 * Create payment for order
 * Tạo yêu cầu thanh toán
 *
 * Chức năng: Tạo payment record và URL thanh toán (nếu là online payment).
 * Luồng xử lý:
 * 1. Kiểm tra đơn hàng có tồn tại và đang ở trạng thái Pending Payment không.
 * 2. Nếu là COD -> Không tạo URL.
 * 3. Nếu đơn đã có Payment record cũ: Reuse và reset trạng thái về PENDING.
 * 4. Nếu chưa có: Tạo Payment record mới.
 * 5. Nếu là VNPAY: Gọi `vnpayService` để tạo URL redirect.
 * @param {number} orderId - ID đơn hàng.
 * @param {string} clientIp - IP khách hàng (cần cho VNPAY).
 * @returns {Promise<object>} Thông tin payment và URL.
 */
const createPayment = async (orderId, clientIp) => {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { payment: true },
    });

    if (!order) {
        throw new ApiError(404, 'Order not found');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new ApiError(400, 'Order is not in pending payment status');
    }

    if (order.paymentMethod === 'COD') {
        throw new ApiError(400, 'COD orders do not require online payment');
    }

    let payment;

    // Check if payment already exists
    if (order.payment) {
        if (order.payment.status === 'PAID') {
            throw new ApiError(400, 'Order is already paid');
        }

        // Reuse existing payment record, reset status to PENDING if needed
        payment = await prisma.payment.update({
            where: { id: order.payment.id },
            data: {
                status: 'PENDING',
                failReason: null,
                failedAt: null,
            },
        });
    } else {
        // Create new payment record
        payment = await prisma.payment.create({
            data: {
                orderId: order.id,
                method: order.paymentMethod,
                amount: order.totalAmount,
                status: 'PENDING',
            },
        });
    }

    // Generate payment URL
    let paymentUrl = null;
    if (order.paymentMethod === 'VNPAY') {
        paymentUrl = vnpayService.createPaymentUrl({
            orderNumber: order.orderNumber,
            amount: Number(order.totalAmount),
            orderDescription: `Thanh toan don hang ${order.orderNumber}`,
        }, clientIp);
    }

    return {
        paymentId: payment.id,
        paymentUrl,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
    };
};

/**
 * Handle VNPAY return (from redirect)
 * Xử lý kết quả trả về từ VNPAY (Redirect)
 *
 * Chức năng: Xử lý khi user thanh toán xong trên VNPAY và được redirect về web.
 * Luồng xử lý:
 * 1. Verify chữ ký (Signature) để đảm bảo dữ liệu không bị sửa.
 * 2. Parse thông tin trả về (Mã đơn, mã giao dịch...).
 * 3. Nếu thành công:
 *    - Update Payment -> PAID.
 *    - Update Order -> PAYMENT_PAID.
 *    - Chuyển trạng thái đơn sang PENDING_CONFIRMATION.
 * 4. Nếu thất bại:
 *    - Update Payment -> FAILED.
 * @param {object} vnpParams - Tham số từ URL redirect.
 * @returns {Promise<object>} Kết quả xử lý.
 */
const handleVnpayReturn = async (vnpParams) => {
    // Verify signature
    if (!vnpayService.verifySignature(vnpParams)) {
        throw new ApiError(400, 'Invalid signature');
    }

    const parsedResponse = vnpayService.parseResponse(vnpParams);
    const { orderNumber, transactionId, bankCode, cardType, responseCode } = parsedResponse;

    // Get order
    const order = await prisma.order.findUnique({
        where: { orderNumber },
        include: { payment: true },
    });

    if (!order) {
        throw new ApiError(404, 'Order not found');
    }

    const isSuccess = vnpayService.isPaymentSuccessful(responseCode);

    // Update order and payment status immediately if successful
    if (isSuccess && order.payment && order.payment.status !== 'PAID') {
        try {
            // Update payment and order status in transaction
            await prisma.$transaction(async (tx) => {
                await tx.payment.update({
                    where: { id: order.payment.id },
                    data: {
                        status: 'PAID',
                        transactionId,
                        bankCode,
                        cardType,
                        paymentData: vnpParams,
                        paidAt: new Date(),
                    },
                });

                await tx.order.update({
                    where: { id: order.id },
                    data: {
                        paymentStatus: 'PAID',
                    },
                });
            });

            // Update order status to pending confirmation
            await orderService.updateStatus(
                order.id,
                OrderStatus.PENDING_CONFIRMATION,
                null,
                `Payment successful via VNPAY. Transaction: ${transactionId}`,
                'SYSTEM'
            );
        } catch (err) {
            // Log error but don't throw - we still want to show success to user
            console.error('[Payment] Failed to update order status on return:', err.message);
        }
    } else if (!isSuccess && order.payment && order.payment.status === 'PENDING') {
        // Update payment status to failed
        try {
            await prisma.payment.update({
                where: { id: order.payment.id },
                data: {
                    status: 'FAILED',
                    failReason: vnpayService.getResponseMessage(responseCode),
                    failedAt: new Date(),
                    paymentData: vnpParams,
                },
            });

            await prisma.order.update({
                where: { id: order.id },
                data: {
                    paymentStatus: 'FAILED',
                },
            });
        } catch (err) {
            console.error('[Payment] Failed to update payment failure status:', err.message);
        }
    }

    return {
        success: isSuccess,
        orderId: order.id,
        orderNumber: order.orderNumber,
        message: vnpayService.getResponseMessage(responseCode),
        ...parsedResponse,
    };
};

/**
 * Handle VNPAY IPN (Instant Payment Notification)
 * Xử lý IPN từ VNPAY
 *
 * Chức năng: Kênh xác nhận thanh toán tin cậy từ Server VNPAY (Background).
 * Luồng xử lý: Tương tự `handleVnpayReturn` nhưng trả về response theo chuẩn IPN của VNPAY.
 * @param {object} vnpParams - Tham số IPN.
 * @returns {Promise<object>} Response cho VNPAY.
 */
const handleVnpayIpn = async (vnpParams) => {
    // Verify signature
    if (!vnpayService.verifySignature(vnpParams)) {
        return { RspCode: '97', Message: 'Invalid signature' };
    }

    const parsedResponse = vnpayService.parseResponse(vnpParams);
    const { orderNumber, amount, transactionId, bankCode, cardType, responseCode } = parsedResponse;

    // Get order and payment
    const order = await prisma.order.findUnique({
        where: { orderNumber },
        include: { payment: true },
    });

    if (!order) {
        return { RspCode: '01', Message: 'Order not found' };
    }

    if (!order.payment) {
        return { RspCode: '01', Message: 'Payment not found' };
    }

    // Check if payment already processed
    if (order.payment.status === 'PAID') {
        return { RspCode: '02', Message: 'Order already confirmed' };
    }

    // Verify amount
    if (Math.abs(Number(order.totalAmount) - amount) > 1) {
        return { RspCode: '04', Message: 'Invalid amount' };
    }

    const isSuccess = vnpayService.isPaymentSuccessful(responseCode);

    if (isSuccess) {
        // Update payment status
        await prisma.$transaction(async (tx) => {
            await tx.payment.update({
                where: { id: order.payment.id },
                data: {
                    status: 'PAID',
                    transactionId,
                    bankCode,
                    cardType,
                    paymentData: vnpParams,
                    paidAt: new Date(),
                },
            });

            await tx.order.update({
                where: { id: order.id },
                data: {
                    paymentStatus: 'PAID',
                },
            });
        });

        // Update order status to pending confirmation
        await orderService.updateStatus(
            order.id,
            OrderStatus.PENDING_CONFIRMATION,
            null,
            `Payment successful via VNPAY. Transaction: ${transactionId}`,
            'SYSTEM'
        );

        return { RspCode: '00', Message: 'Confirm Success' };
    } else {
        // Payment failed
        await prisma.payment.update({
            where: { id: order.payment.id },
            data: {
                status: 'FAILED',
                failReason: vnpayService.getResponseMessage(responseCode),
                failedAt: new Date(),
                paymentData: vnpParams,
            },
        });

        await prisma.order.update({
            where: { id: order.id },
            data: {
                paymentStatus: 'FAILED',
            },
        });

        return { RspCode: '00', Message: 'Confirm Success' };
    }
};

/**
 * Get payment by order ID
 * @param {number} orderId - Order ID
 * @returns {Promise<object>} Payment details
 */
const getByOrderId = async (orderId) => {
    const payment = await prisma.payment.findUnique({
        where: { orderId },
    });

    if (!payment) {
        throw new ApiError(404, 'Payment not found');
    }

    return payment;
};

/**
 * Mark payment as failed (for timeout)
 * Đánh dấu thanh toán thất bại
 *
 * Chức năng: Dùng khi đơn hàng hết hạn thanh toán (hủy đơn treo).
 * @param {number} orderId - Order ID.
 * @param {string} reason - Lý do.
 * @returns {Promise<object>} Payment update.
 */
const markFailed = async (orderId, reason = 'Payment timeout') => {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { payment: true },
    });

    if (!order) {
        throw new ApiError(404, 'Order not found');
    }

    if (order.payment) {
        await prisma.payment.update({
            where: { id: order.payment.id },
            data: {
                status: 'FAILED',
                failReason: reason,
                failedAt: new Date(),
            },
        });
    }

    await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'FAILED' },
    });

    return { success: true };
};

/**
 * Confirm COD payment collected
 * Xác nhận đã thu tiền COD
 *
 * Chức năng: Shipper xác nhận đã thu tiền.
 * Luồng xử lý:
 * 1. Check đơn COD.
 * 2. Update status Payment và Order -> COD_COLLECTED / PAID.
 * @param {number} orderId - Order ID.
 * @returns {Promise<object>} Payment update.
 */
const confirmCOD = async (orderId) => {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { payment: true },
    });

    if (!order) {
        throw new ApiError(404, 'Order not found');
    }

    if (order.paymentMethod !== 'COD') {
        throw new ApiError(400, 'Not a COD order');
    }

    // Determine target payment status
    const targetStatus = 'COD_COLLECTED';

    let payment;
    if (order.payment) {
        payment = await prisma.payment.update({
            where: { id: order.payment.id },
            data: {
                status: targetStatus,
                paidAt: new Date(),
            },
        });
    } else {
        payment = await prisma.payment.create({
            data: {
                orderId: order.id,
                method: 'COD',
                amount: order.totalAmount,
                status: targetStatus,
                paidAt: new Date(),
            },
        });
    }

    // Update order payment status
    await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: targetStatus },
    });

    return payment;
};

module.exports = {
    createPayment,
    handleVnpayReturn,
    handleVnpayIpn,
    getByOrderId,
    markFailed,
    confirmCOD,
};

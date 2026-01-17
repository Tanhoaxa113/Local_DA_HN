/**
 * Payment Service
 * Handles payment operations and integrates with payment gateways
 */
const prisma = require('../config/database');
const config = require('../config');
const ApiError = require('../utils/ApiError');
const vnpayService = require('./vnpay.service');
const orderService = require('./order.service');
const { OrderStatus } = require('../utils/orderStateMachine');

/**
 * Create payment for order
 * @param {number} orderId - Order ID
 * @param {string} clientIp - Client IP address
 * @returns {Promise<object>} Payment info with URL
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
 * Updates order status immediately without waiting for IPN
 * @param {object} vnpParams - VNPay return parameters
 * @returns {Promise<object>} Payment result
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
 * This is called by VNPay server - the source of truth for payment status
 * @param {object} vnpParams - VNPay IPN parameters
 * @returns {Promise<object>} IPN response
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
 * @param {number} orderId - Order ID
 * @param {string} reason - Failure reason
 * @returns {Promise<object>} Updated payment
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
 * @param {number} orderId - Order ID
 * @returns {Promise<object>} Updated payment
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

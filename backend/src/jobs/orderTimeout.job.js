/**
 * Order Timeout Job
 * Cancels orders that have exceeded payment timeout
 */
const cron = require('node-cron');
const prisma = require('../config/database');
const stockService = require('../services/stock.service');
const { OrderStatus } = require('../utils/orderStateMachine');

/**
 * Process timed-out orders
 * Runs every minute to check for orders past their payment deadline
 */
const processTimeoutOrders = async () => {
    try {
        // Find orders that are:
        // - Status: PENDING_PAYMENT
        // - lockedUntil has passed
        // - Payment not successful
        const timedOutOrders = await prisma.order.findMany({
            where: {
                status: OrderStatus.PENDING_PAYMENT,
                lockedUntil: {
                    lt: new Date(),
                },
                paymentStatus: {
                    in: ['UNPAID', 'PENDING'],
                },
            },
        });

        if (timedOutOrders.length === 0) {
            return { processed: 0 };
        }

        console.log(`[OrderTimeoutJob] Found ${timedOutOrders.length} timed-out orders`);

        for (const order of timedOutOrders) {
            try {
                // Release stock locks
                await stockService.releaseStock(order.id);

                // Update order status
                await prisma.$transaction([
                    prisma.order.update({
                        where: { id: order.id },
                        data: {
                            status: OrderStatus.PROCESSING_FAILED,
                            cancelledAt: new Date(),
                            cancelReason: 'Payment timeout',
                        },
                    }),
                    prisma.orderStatusHistory.create({
                        data: {
                            orderId: order.id,
                            fromStatus: order.status,
                            toStatus: OrderStatus.PROCESSING_FAILED,
                            note: 'Automatic cancellation due to payment timeout',
                            changedBy: null,
                        },
                    }),
                    // Update payment if exists
                    prisma.payment.updateMany({
                        where: { orderId: order.id, status: 'PENDING' },
                        data: {
                            status: 'FAILED',
                            failReason: 'Payment timeout',
                            failedAt: new Date(),
                        },
                    }),
                ]);

                // Refund loyalty points if used
                if (order.loyaltyPointsUsed > 0) {
                    await prisma.user.update({
                        where: { id: order.userId },
                        data: {
                            loyaltyPoints: { increment: order.loyaltyPointsUsed },
                        },
                    });
                }

                // Emit real-time notifications
                try {
                    const socket = require('../socket');

                    // Notify user about order cancellation
                    socket.emitToUser(order.userId, 'order_cancelled', {
                        orderId: order.id,
                        orderNumber: order.orderNumber,
                        reason: 'Payment timeout',
                        cancelledAt: new Date(),
                    });

                    // Notify admins
                    socket.emitToAdmin('order_cancelled', {
                        orderId: order.id,
                        orderNumber: order.orderNumber,
                        reason: 'Payment timeout (automatic)',
                        cancelledAt: new Date(),
                    });
                } catch (socketError) {
                    console.error('[OrderTimeoutJob] Socket emission failed:', socketError.message);
                }

                console.log(`[OrderTimeoutJob] Cancelled order ${order.orderNumber}`);
            } catch (error) {
                console.error(`[OrderTimeoutJob] Error processing order ${order.orderNumber}:`, error.message);
            }
        }

        return { processed: timedOutOrders.length };
    } catch (error) {
        console.error('[OrderTimeoutJob] Job failed:', error.message);
        return { error: error.message };
    }
};

/**
 * Start the cron job
 * Runs every minute
 */
const start = () => {
    cron.schedule('* * * * *', async () => {
        console.log('[OrderTimeoutJob] Running...');
        const result = await processTimeoutOrders();
        if (result.processed > 0) {
            console.log(`[OrderTimeoutJob] Processed ${result.processed} orders`);
        }
    });

    console.log('✅ OrderTimeoutJob scheduled (every minute)');
};

module.exports = {
    start,
    processTimeoutOrders,
};

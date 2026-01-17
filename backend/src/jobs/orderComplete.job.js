/**
 * Order Completion Job
 * Automatically completes delivered orders after X days and awards loyalty points
 */
const cron = require('node-cron');
const prisma = require('../config/database');
const config = require('../config');
const loyaltyService = require('../services/loyalty.service');
const { OrderStatus } = require('../utils/orderStateMachine');

/**
 * Process orders ready for auto-completion
 * Orders that have been delivered for X days become completed
 */
const processCompletableOrders = async () => {
    try {
        const completionDays = config.order.completionDays || 7;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - completionDays);

        // Find orders that are:
        // - Status: DELIVERED
        // - deliveredAt is older than completion threshold
        const completableOrders = await prisma.order.findMany({
            where: {
                status: OrderStatus.DELIVERED,
                deliveredAt: {
                    lt: cutoffDate,
                },
            },
            include: {
                user: {
                    include: { tier: true },
                },
            },
        });

        if (completableOrders.length === 0) {
            return { processed: 0 };
        }

        console.log(`[OrderCompleteJob] Found ${completableOrders.length} orders to complete`);

        for (const order of completableOrders) {
            try {
                // Calculate loyalty points
                const points = loyaltyService.calculatePoints(
                    Number(order.totalAmount),
                    Number(order.user.tier?.pointMultiplier) || 1
                );

                // Update order and award points
                await prisma.$transaction([
                    prisma.order.update({
                        where: { id: order.id },
                        data: {
                            status: OrderStatus.COMPLETED,
                            completedAt: new Date(),
                            loyaltyPointsEarned: points,
                        },
                    }),
                    prisma.orderStatusHistory.create({
                        data: {
                            orderId: order.id,
                            fromStatus: order.status,
                            toStatus: OrderStatus.COMPLETED,
                            note: `Auto-completed after ${completionDays} days. Points awarded: ${points}`,
                            changedBy: null,
                        },
                    }),
                    prisma.user.update({
                        where: { id: order.userId },
                        data: {
                            loyaltyPoints: { increment: points },
                        },
                    }),
                ]);

                // Check for tier upgrade
                await loyaltyService.checkTierUpgrade(order.userId);

                console.log(`[OrderCompleteJob] Completed order ${order.orderNumber}, awarded ${points} points`);
            } catch (error) {
                console.error(`[OrderCompleteJob] Error processing order ${order.orderNumber}:`, error.message);
            }
        }

        return { processed: completableOrders.length };
    } catch (error) {
        console.error('[OrderCompleteJob] Job failed:', error.message);
        return { error: error.message };
    }
};

/**
 * Start the cron job
 * Runs daily at midnight
 */
const start = () => {
    // Run at 00:00 every day
    cron.schedule('0 0 * * *', async () => {
        console.log('[OrderCompleteJob] Running...');
        const result = await processCompletableOrders();
        if (result.processed > 0) {
            console.log(`[OrderCompleteJob] Completed ${result.processed} orders`);
        }
    });

    console.log('✅ OrderCompleteJob scheduled (daily at midnight)');
};

module.exports = {
    start,
    processCompletableOrders,
};

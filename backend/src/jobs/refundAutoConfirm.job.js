/**
 * Refund Auto-confirm Job
 * Automatically confirms refunds after 3 days of being in REFUNDED status
 */
const cron = require('node-cron');
const orderService = require('../services/order.service');

const start = () => {
    // Run daily at midnight
    cron.schedule('0 0 * * *', async () => {
        await processRefundAutoConfirm();
    });
    console.log('   ✓ Refund Auto-confirm job scheduled (Daily at 00:00)');
};

const processRefundAutoConfirm = async () => {
    try {
        // console.log('[Job] checking for refunds to auto-confirm...');
        await orderService.autoConfirmRefunds();
    } catch (error) {
        console.error('[Job] Refund Auto-confirm failed:', error);
    }
};

module.exports = {
    start,
    processRefundAutoConfirm,
};

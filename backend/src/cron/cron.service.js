/**
 * Cron Service
 * Scheduled tasks for the application
 */
const cron = require('node-cron');
const orderService = require('../services/order.service');

const initCronJobs = () => {
    console.log('Initializing cron jobs...');

    // Run every day at midnight (00:00)
    cron.schedule('0 0 * * *', async () => {
        console.log('[Cron] Running daily update tasks...');

        // Auto-confirm refunds after 3 days
        await orderService.autoConfirmRefunds();
    });

    console.log('[Cron] Jobs scheduled.');
};

module.exports = { initCronJobs };

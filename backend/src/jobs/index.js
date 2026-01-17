/**
 * Jobs Index
 * Centralized job management and initialization
 */
const orderTimeoutJob = require('./orderTimeout.job');
const orderCompleteJob = require('./orderComplete.job');
const refundAutoConfirmJob = require('./refundAutoConfirm.job');

/**
 * Start all scheduled jobs
 */
const startAll = () => {
    console.log('\n🕐 Starting scheduled jobs...');

    orderTimeoutJob.start();
    orderCompleteJob.start();
    refundAutoConfirmJob.start();

    console.log('');
};

/**
 * Run jobs manually (for testing)
 */
const runManually = async (jobName) => {
    switch (jobName) {
        case 'orderTimeout':
            return orderTimeoutJob.processTimeoutOrders();
        case 'orderComplete':
            return orderCompleteJob.processCompletableOrders();
        case 'refundAutoConfirm':
            return refundAutoConfirmJob.processRefundAutoConfirm();
        default:
            throw new Error(`Unknown job: ${jobName}`);
    }
};

module.exports = {
    startAll,
    runManually,
    orderTimeoutJob,
    orderCompleteJob,
    refundAutoConfirmJob,
};

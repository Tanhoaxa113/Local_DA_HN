/**
 * Cron Service
 * Scheduled tasks for the application
 * Dịch vụ lập lịch tác vụ tự động (Cron Job)
 */
const cron = require('node-cron');
const orderService = require('../services/order.service');

/**
 * Initialize all cron jobs
 * Khởi tạo các tác vụ chạy ngầm định kỳ
 * 
 * Chức năng: Đăng ký các Cron Job với hệ thống.
 * Luồng xử lý:
 * 1. Được gọi một lần duy nhất khi server khởi động (trong app.js hoặc server.js).
 * 2. Đăng ký các schedule (Lập lịch).
 * 3. Log thông báo xác nhận.
 */
const initCronJobs = () => {
    console.log('Initializing cron jobs...');

    // Run every day at midnight (00:00)
    // Chạy mỗi ngày vào lúc 00:00
    // Cấu trúc Cron: Phút(0) Giờ(0) Ngày(*) Tháng(*) Thứ(*)
    cron.schedule('0 0 * * *', async () => {
        console.log('[Cron] Running daily update tasks...');

        // Auto-confirm refunds after 3 days
        // Tự động xác nhận hoàn tiền sau 3 ngày
        await orderService.autoConfirmRefunds();
    });

    console.log('[Cron] Jobs scheduled.');
};

module.exports = { initCronJobs };

/**
 * Server Entry Point
 * Starts the Express server with Socket.io
 * Điểm khởi chạy Server (Express + Socket.io)
 */
const http = require('http');
const app = require('./app');
const config = require('./config');
const jobs = require('./jobs');
const socket = require('./socket');

// Create HTTP server
// Tạo HTTP Server từ Express App
const server = http.createServer(app);

// Initialize Socket.io
// Khởi tạo Socket.io với Server vừa tạo
socket.init(server);

// Start server
// Khởi chạy Server lắng nghe Port
const PORT = config.app.port;

server.listen(PORT, () => {
    console.log('================================================');
    console.log(`🚀 ${config.app.name} v${config.app.version}`);
    console.log(`📍 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${config.app.env}`);
    console.log(`🔗 API URL: http://localhost:${PORT}/api`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
    console.log('================================================');

    // Start scheduled jobs
    // Bắt đầu chạy các Cron Job
    jobs.startAll();
});

// Handle unhandled promise rejections
// Bắt lỗi Promise Rejection không được xử lý (tránh crash app)
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit in development, but log and continue
    if (config.app.env === 'production') {
        server.close(() => {
            process.exit(1);
        });
    }
});

// Handle uncaught exceptions
// Bắt lỗi Exception không được xử lý
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    if (config.app.env === 'production') {
        server.close(() => {
            process.exit(1);
        });
    }
});

// Graceful shutdown
// Xử lý tắt server an toàn (SIGTERM)
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});

module.exports = server;

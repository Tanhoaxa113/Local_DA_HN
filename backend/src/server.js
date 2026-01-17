/**
 * Server Entry Point
 * Starts the Express server with Socket.io
 */
const http = require('http');
const app = require('./app');
const config = require('./config');
const jobs = require('./jobs');
const socket = require('./socket');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
socket.init(server);

// Start server
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
    jobs.startAll();
});

// Handle unhandled promise rejections
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
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    if (config.app.env === 'production') {
        server.close(() => {
            process.exit(1);
        });
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});

module.exports = server;

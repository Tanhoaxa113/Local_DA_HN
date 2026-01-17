/**
 * Socket.io Service
 * Handles real-time communication
 */
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');

let io;

/**
 * Initialize Socket.io
 * @param {object} server - HTTP server instance
 */
const init = (server) => {
    io = socketIo(server, {
        cors: {
            origin: config.app.frontendUrl || '*', // Allow all for dev, restrict in prod
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    // Middleware for authentication
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
            return next(new Error('Authentication error'));
        }

        try {
            const decoded = jwt.verify(token, config.jwt.secret);
            socket.user = decoded;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`[Socket] Client connected: ${socket.id} (User: ${socket.user.userId})`);

        // Join user-specific room
        socket.join(`user:${socket.user.userId}`);

        // Join role-specific rooms
        if (socket.user.role) {
            socket.join(`role:${socket.user.role}`);

            // Admins and staff join admin room
            if (['ADMIN', 'SALES_MANAGER', 'SALES_STAFF', 'WAREHOUSE'].includes(socket.user.role)) {
                socket.join('admin_notifications');
            }
        }

        socket.on('disconnect', () => {
            console.log(`[Socket] Client disconnected: ${socket.id}`);
        });
    });

    console.log('✅ Socket.io initialized');
    return io;
};

/**
 * Get IO instance
 * @returns {object} Socket.io instance
 */
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

/**
 * Emit event to specific user
 * @param {number} userId - User ID
 * @param {string} event - Event name
 * @param {object} data - Data to send
 */
const emitToUser = (userId, event, data) => {
    if (!io) return;
    io.to(`user:${userId}`).emit(event, data);
};

/**
 * Emit event to admin/staff
 * @param {string} event - Event name
 * @param {object} data - Data to send
 */
const emitToAdmin = (event, data) => {
    if (!io) return;
    io.to('admin_notifications').emit(event, data);
};

/**
 * Emit event to specific role
 * @param {string} role - Role name
 * @param {string} event - Event name
 * @param {object} data - Data to send
 */
const emitToRole = (role, event, data) => {
    if (!io) return;
    io.to(`role:${role}`).emit(event, data);
};

module.exports = {
    init,
    getIO,
    emitToUser,
    emitToAdmin,
    emitToRole,
};

/**
 * Socket.io Client Configuration
 * Handles real-time communication with backend
 */
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

let socket = null;

/**
 * Initialize socket connection with authentication
 * @param {string} token - JWT access token
 * @returns {object} Socket instance
 */
export const initSocket = (token) => {
    if (socket?.connected) {
        return socket;
    }

    socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
    });

    socket.on('connect', () => {
        console.log('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error.message);
    });

    return socket;
};

/**
 * Get current socket instance
 * @returns {object|null} Socket instance or null
 */
export const getSocket = () => socket;

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

/**
 * Subscribe to an event
 * @param {string} event - Event name
 * @param {function} callback - Event handler
 */
export const subscribeToEvent = (event, callback) => {
    if (socket) {
        socket.on(event, callback);
    }
};

/**
 * Unsubscribe from an event
 * @param {string} event - Event name
 * @param {function} callback - Event handler (optional)
 */
export const unsubscribeFromEvent = (event, callback) => {
    if (socket) {
        if (callback) {
            socket.off(event, callback);
        } else {
            socket.off(event);
        }
    }
};

export default {
    initSocket,
    getSocket,
    disconnectSocket,
    subscribeToEvent,
    unsubscribeFromEvent,
};

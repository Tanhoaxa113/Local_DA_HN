"use client";

/**
 * Socket Context
 * Provides real-time socket connection throughout the app
 */
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { initSocket, disconnectSocket, getSocket } from '@/lib/socket';

const SocketContext = createContext(null);

/**
 * Socket event types
 */
export const SOCKET_EVENTS = {
    // Order events
    ORDER_CREATED: 'order_created',
    ORDER_STATUS_UPDATED: 'order_status_updated',
    ORDER_CANCELLED: 'order_cancelled',

    // Admin events
    ADMIN_ORDER_UPDATED: 'admin_order_updated',

    // Payment events  
    PAYMENT_COMPLETED: 'payment_completed',
    PAYMENT_FAILED: 'payment_failed',
};

export function SocketProvider({ children }) {
    const { user, isAuthenticated } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const listenersRef = useRef(new Map());

    // Initialize socket when authenticated
    useEffect(() => {
        if (isAuthenticated && user) {
            const token = localStorage.getItem('accessToken');
            if (token) {
                const socket = initSocket(token);

                socket.on('connect', () => {
                    setIsConnected(true);
                });

                socket.on('disconnect', () => {
                    setIsConnected(false);
                });

                // Listen for order status updates
                socket.on(SOCKET_EVENTS.ORDER_STATUS_UPDATED, (data) => {
                    addNotification({
                        type: 'order_update',
                        title: 'Cập nhật đơn hàng',
                        message: `Đơn hàng #${data.orderNumber} đã chuyển sang trạng thái mới`,
                        data,
                    });
                });

                // Listen for order cancellation
                socket.on(SOCKET_EVENTS.ORDER_CANCELLED, (data) => {
                    addNotification({
                        type: 'order_cancelled',
                        title: 'Đơn hàng đã hủy',
                        message: `Đơn hàng #${data.orderNumber} đã bị hủy: ${data.reason}`,
                        data,
                    });
                });

                // Listen for new orders (admin)
                socket.on(SOCKET_EVENTS.ORDER_CREATED, (data) => {
                    addNotification({
                        type: 'new_order',
                        title: 'Đơn hàng mới',
                        message: `Đơn hàng mới #${data.orderNumber}`,
                        data,
                    });
                });
            }
        }

        return () => {
            disconnectSocket();
            setIsConnected(false);
        };
    }, [isAuthenticated, user]);

    // Add notification
    const addNotification = useCallback((notification) => {
        const newNotification = {
            id: Date.now(),
            timestamp: new Date(),
            read: false,
            ...notification,
        };

        setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    }, []);

    // Mark notification as read
    const markAsRead = useCallback((notificationId) => {
        setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
    }, []);

    // Clear all notifications
    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    // Subscribe to custom event
    const subscribe = useCallback((event, callback) => {
        const socket = getSocket();
        if (socket) {
            socket.on(event, callback);

            // Track listener for cleanup
            if (!listenersRef.current.has(event)) {
                listenersRef.current.set(event, []);
            }
            listenersRef.current.get(event).push(callback);
        }
    }, []);

    // Unsubscribe from custom event
    const unsubscribe = useCallback((event, callback) => {
        const socket = getSocket();
        if (socket) {
            socket.off(event, callback);
        }
    }, []);

    const value = {
        isConnected,
        notifications,
        unreadCount: notifications.filter(n => !n.read).length,
        addNotification,
        markAsRead,
        clearNotifications,
        subscribe,
        unsubscribe,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
}

export default SocketContext;

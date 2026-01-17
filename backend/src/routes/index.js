/**
 * API Routes
 * Main router that combines all route modules
 */
const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const productRoutes = require('./product.routes');
const categoryRoutes = require('./category.routes');
const brandRoutes = require('./brand.routes');
const cartRoutes = require('./cart.routes');
const orderRoutes = require('./order.routes');
const paymentRoutes = require('./payment.routes');
const addressRoutes = require('./address.routes');
const adminRoutes = require('./admin.routes');
const loyaltyRoutes = require('./loyalty.routes');

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        data: {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
        },
    });
});

// API version info
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to Clothing Shop API',
        data: {
            version: '1.0.0',
            documentation: '/api/docs',
            endpoints: {
                auth: '/api/auth',
                users: '/api/users',
                products: '/api/products',
                categories: '/api/categories',
                brands: '/api/brands',
                cart: '/api/cart',
                orders: '/api/orders',
                payment: '/api/payment',
                addresses: '/api/addresses',
            },
        },
    });
});

/**
 * Route Modules
 */

// Authentication routes
router.use('/auth', authRoutes);

// Product routes
router.use('/products', productRoutes);

// Category routes
router.use('/categories', categoryRoutes);

// Brand routes
router.use('/brands', brandRoutes);

// Cart routes
router.use('/cart', cartRoutes);

// Order routes
router.use('/orders', orderRoutes);

// Payment routes
router.use('/payment', paymentRoutes);

// Address routes
router.use('/addresses', addressRoutes);

// Admin routes
router.use('/admin', adminRoutes);

// Loyalty routes
router.use('/loyalty', loyaltyRoutes);

// User routes (to be added)
// router.use('/users', userRoutes);

module.exports = router;


/**
 * API Routes
 * Main router that combines all route modules
 * Router chính, tổng hợp tất cả các modules route khác
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
// Endpoint kiểm tra sức khỏe server (thường dùng cho Load Balancer hoặc Monitoring)
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
// Thông tin phiên bản API
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
 * Các module route con
 */

// Authentication routes - Xác thực người dùng (Đăng ký, Đăng nhập...)
router.use('/auth', authRoutes);

// Product routes - Quản lý sản phẩm (Danh sách, Chi tiết, CRUD...)
router.use('/products', productRoutes);

// Category routes - Quản lý danh mục
router.use('/categories', categoryRoutes);

// Brand routes - Quản lý thương hiệu
router.use('/brands', brandRoutes);

// Cart routes - Quản lý giỏ hàng
router.use('/cart', cartRoutes);

// Order routes - Quản lý đơn hàng
router.use('/orders', orderRoutes);

// Payment routes - Thanh toán (VNPAY, COD...)
router.use('/payment', paymentRoutes);

// Address routes - Sổ địa chỉ người dùng
router.use('/addresses', addressRoutes);

// Admin routes - Routes dành cho Admin/Manager (Dashboard, Thống kê...)
router.use('/admin', adminRoutes);

// Loyalty routes - Điểm thưởng, Hạng thành viên
router.use('/loyalty', loyaltyRoutes);

// User routes (to be added)
// router.use('/users', userRoutes);

module.exports = router;


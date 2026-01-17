/**
 * Application configuration
 */
require('dotenv').config();

const config = {
    // App settings
    app: {
        env: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT) || 3001,
        name: 'Clothing Shop API',
        version: '1.0.0',
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    },

    // JWT settings
    jwt: {
        secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    },

    // Redis settings
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
    },

    // Stock lock settings
    stockLock: {
        ttlMinutes: parseInt(process.env.STOCK_LOCK_TTL_MINUTES) || 15,
    },

    // VNPAY settings
    vnpay: {
        tmnCode: process.env.VNPAY_TMN_CODE,
        hashSecret: process.env.VNPAY_HASH_SECRET,
        url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
        returnUrl: process.env.VNPAY_RETURN_URL,
        ipnUrl: process.env.VNPAY_IPN_URL,
    },

    // File upload settings
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
        uploadDir: process.env.UPLOAD_DIR || 'uploads',
        allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
        ],
    },

    // Pagination defaults
    pagination: {
        defaultPage: 1,
        defaultLimit: 10,
        maxLimit: 100,
    },

    // Order settings
    order: {
        paymentTimeoutMinutes: 15,
        completionDays: 7, // Days after delivery to auto-complete
    },

    // Loyalty settings
    loyalty: {
        pointsPerAmount: 1000, // 1 point per 1000 VND spent
        pointValue: 100, // 1 point = 100 VND discount
    },
};

module.exports = config;

/**
 * Application configuration
 * Centralized configuration file loading from environment variables
 * File cấu hình tổng hợp toàn bộ ứng dụng, load từ biến môi trường (.env)
 */
require('dotenv').config();

const config = {
    // App settings
    // Cấu hình chung cho toàn bộ ứng dụng
    // Load ưu tiên từ biến môi trường (.env), nếu không có sẽ dùng giá trị mặc định (sau dấu ||)
    app: {
        env: process.env.NODE_ENV || 'development', // Môi trường chạy: development, production, test
        port: parseInt(process.env.PORT) || 3001, // Port mà server sẽ lắng nghe
        name: 'Clothing Shop API', // Tên ứng dụng
        version: '1.0.0', // Phiên bản
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000', // URL của Frontend (dùng cho CORS hoặc redirect)
    },

    // JWT settings
    // Cấu hình cho Json Web Token (dùng để xác thực người dùng)
    jwt: {
        secret: process.env.JWT_SECRET || 'default-secret-change-in-production', // Khóa bí mật để ký token (QUAN TRỌNG: Cần bảo mật)
        expiresIn: process.env.JWT_EXPIRES_IN || '7d', // Thời gian sống của Access Token
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret', // Khóa bí mật để ký refresh token
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d', // Thời gian sống của Refresh Token
    },

    // Redis settings
    // Cấu hình kết nối tới Redis Server (Dùng cho Caching, Session, Locking)
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
    },

    // Stock lock settings
    // Cấu hình thời gian giữ "khóa" sản phẩm trong kho khi người dùng thêm vào giỏ hoặc đặt hàng
    // Giúp tránh tình trạng bán quá số lượng tồn kho (Race Condition)
    stockLock: {
        ttlMinutes: parseInt(process.env.STOCK_LOCK_TTL_MINUTES) || 15, // Mặc định giữ chỗ 15 phút
    },

    // VNPAY settings
    // Cấu hình tích hợp cổng thanh toán VNPAY
    // Các thông số này được cấp bởi VNPAY Merchant Admin
    vnpay: {
        tmnCode: process.env.VNPAY_TMN_CODE, // Mã Website (Terminal ID)
        hashSecret: process.env.VNPAY_HASH_SECRET, // Chuỗi bí mật (Secret Key) để tạo checksum bảo mật dữ liệu
        url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html', // URL thanh toán (Sandbox hoặc Production)
        returnUrl: process.env.VNPAY_RETURN_URL, // URL người dùng được chuyển hướng về sau khi thanh toán xong
        ipnUrl: process.env.VNPAY_IPN_URL, // URL Server VNPAY gọi về để thông báo kết quả (Server-to-Server)
    },

    // File upload settings
    // Cấu hình giới hạn và thư mục lưu trữ file upload
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // Giới hạn dung lượng file (5MB)
        uploadDir: process.env.UPLOAD_DIR || 'uploads', // Thư mục lưu trữ file trên ổ cứng
        allowedMimeTypes: [ // Các định dạng file cho phép
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
        ],
    },

    // Pagination defaults
    // Giá trị mặc định cho phân trang khi client không gửi params page/limit
    pagination: {
        defaultPage: 1, // Trang đầu tiên
        defaultLimit: 10, // 10 item mỗi trang
        maxLimit: 100, // Tối đa 100 item mỗi trang (tránh load quá nặng DB)
    },

    // Order settings
    // Các quy định về xử lý đơn hàng
    order: {
        paymentTimeoutMinutes: 15, // Thời gian tối đa chờ thanh toán online trước khi hủy đơn
        completionDays: 7, // Sau bao lâu thì đơn hàng "Đã giao" tự động chuyển thành "Hoàn thành" (để chốt doanh thu/hoa hồng)
    },

    // Loyalty settings
    // Cấu hình quy đổi điểm thưởng
    loyalty: {
        pointsPerAmount: 1000, // Tiêu 1000 VND tích được 1 điểm (tỷ lệ tích điểm)
        pointValue: 100, // 1 điểm đổi được 100 VND giảm giá (tỷ lệ tiêu điểm)
    },
};

module.exports = config;

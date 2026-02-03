/**
 * Database configuration using Prisma Client
 * Prisma 6.x - Standard configuration
 * Cấu hình kết nối Database thông qua Prisma Client
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
});

// Connection test
// Hàm kiểm tra kết nối tới Database
// Luồng xử lý:
// 1. Gọi hàm prisma.$connect() để thử thiết lập kết nối
// 2. Nếu thành công: Ghi log xác nhận và trả về true
// 3. Nếu thất bại: Ghi log lỗi chi tiết và trả về false
// Trigger: Được gọi khi server khởi động (trong file server.js) để đảm bảo DB sẵn sàng trước khi nhận request.
const testConnection = async () => {
    try {
        await prisma.$connect();
        console.log('✅ Database connected successfully');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

// Graceful shutdown
// Xử lý ngắt kết nối khi ứng dụng dừng hoạt động
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

module.exports = prisma;
module.exports.testConnection = testConnection;

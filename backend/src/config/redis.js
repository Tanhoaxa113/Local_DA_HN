/**
 * Redis configuration for caching, sessions, and stock locking
 * Cấu hình Redis cho Caching, Sessions, và Khóa tồn kho (Stock Locking)
 */
const Redis = require('ioredis');

const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryDelayOnFailover: 100, // Thử lại ngay lập tức
    maxRetriesPerRequest: 3, // Tối đa 3 lần thử lại
    lazyConnect: true, // Chỉ kết nối khi cần dùng
};

// Main Redis client
// Client Redis chính
const redis = new Redis(redisConfig);

// Subscriber client for pub/sub (if needed)
// Client Redis cho Pub/Sub (nếu cần dùng)
const redisSub = new Redis(redisConfig);

// Connection event handlers
redis.on('connect', () => {
    console.log('✅ Redis connected successfully');
});

redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message);
});

redis.on('close', () => {
    console.log('Redis connection closed');
});

/**
 * Redis utility functions for stock locking
 * Các hàm tiện ích Redis
 */
const redisUtils = {
    /**
     * Acquire a lock on stock for a variant
     * Xin khóa tồn kho cho một biến thể sản phẩm (Distributed Lock / Optimistic Locking).
     * Chức năng này cực kỳ quan trọng để ngăn chặn "Race Condition" khi nhiều người cùng mua 1 sản phẩm còn ít hàng.
     * 
     * Mô tả luồng:
     * 1. Tạo key khóa theo định dạng `lock_stock_{variantId}`.
     * 2. Gọi lệnh SET của Redis với các tham số:
     *    - 'NX' (Not Exists): Chỉ set nếu key CHƯA tồn tại.
     *    - 'EX' (Expire): Tự động xóa key sau `ttlSeconds` giây (tránh Deadlock nếu server crash mà chưa kịp mở khóa).
     * 3. Kết quả:
     *    - Nếu trả về 'OK': Khóa thành công (chưa ai giữ khóa này) -> Trả về lockKey.
     *    - Nếu trả về null: Khóa thất bại (đã có ai đó giữ khóa) -> Trả về null.
     * 
     * Trigger: Gọi khi bắt đầu xử lý tạo đơn hàng (createOrder) hoặc cập nhật giỏ hàng.
     * 
     * @param {string} variantId - Product variant ID
     * @param {number} ttlSeconds - Lock TTL in seconds (default 900s = 15 phút)
     * @returns {Promise<string|null>} Lock key if acquired, null otherwise
     */
    async acquireStockLock(variantId, ttlSeconds = 900) {
        const lockKey = `lock_stock_${variantId}`;
        const lockValue = Date.now().toString();

        // SETNX with TTL (Set if Not Exists)
        const result = await redis.set(lockKey, lockValue, 'EX', ttlSeconds, 'NX');
        return result === 'OK' ? lockKey : null;
    },

    /**
     * Release a stock lock
     * Giải phóng khóa tồn kho
     * @param {string} lockKey - Lock key to release
     */
    async releaseStockLock(lockKey) {
        await redis.del(lockKey);
    },

    /**
     * Check if a lock exists
     * Kiểm tra xem đang có khóa không
     * @param {string} variantId - Product variant ID
     * @returns {Promise<boolean>}
     */
    async isStockLocked(variantId) {
        const lockKey = `lock_stock_${variantId}`;
        const exists = await redis.exists(lockKey);
        return exists === 1;
    },

    /**
     * Get TTL of a stock lock
     * Lấy thời gian còn lại của khóa (Seconds)
     * @param {string} variantId - Product variant ID
     * @returns {Promise<number>} TTL in seconds, -2 if not exists
     */
    async getStockLockTTL(variantId) {
        const lockKey = `lock_stock_${variantId}`;
        return await redis.ttl(lockKey);
    },

    /**
     * Store session data
     * Lưu session người dùng
     * @param {string} sessionId - Session ID
     * @param {object} data - Session data
     * @param {number} ttlSeconds - TTL in seconds
     */
    async setSession(sessionId, data, ttlSeconds = 86400) {
        const key = `session_${sessionId}`;
        await redis.setex(key, ttlSeconds, JSON.stringify(data));
    },

    /**
     * Get session data
     * Lấy session người dùng
     * @param {string} sessionId - Session ID
     * @returns {Promise<object|null>}
     */
    async getSession(sessionId) {
        const key = `session_${sessionId}`;
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    },

    /**
     * Delete session
     * Xóa session
     * @param {string} sessionId - Session ID
     */
    async deleteSession(sessionId) {
        const key = `session_${sessionId}`;
        await redis.del(key);
    },

    /**
     * Cache data with TTL
     * Lưu Cache dữ liệu chung
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     * @param {number} ttlSeconds - TTL in seconds
     */
    async cache(key, data, ttlSeconds = 3600) {
        await redis.setex(`cache_${key}`, ttlSeconds, JSON.stringify(data));
    },

    /**
     * Get cached data
     * Lấy dữ liệu từ Cache
     * @param {string} key - Cache key
     * @returns {Promise<any|null>}
     */
    async getCache(key) {
        const data = await redis.get(`cache_${key}`);
        return data ? JSON.parse(data) : null;
    },

    /**
     * Invalidate cache
     * Xóa Cache
     * @param {string} key - Cache key
     */
    async invalidateCache(key) {
        await redis.del(`cache_${key}`);
    },

    /**
     * Invalidate cache by pattern
     * Xóa Cache theo pattern (VD: Xóa toàn bộ cache sản phẩm 'product_*')
     * @param {string} pattern - Pattern to match
     */
    async invalidateCacheByPattern(pattern) {
        const keys = await redis.keys(`cache_${pattern}*`);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    },
};

module.exports = {
    redis,
    redisSub,
    redisUtils,
};

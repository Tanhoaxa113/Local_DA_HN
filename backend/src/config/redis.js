/**
 * Redis configuration for caching, sessions, and stock locking
 */
const Redis = require('ioredis');

const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
};

// Main Redis client
const redis = new Redis(redisConfig);

// Subscriber client for pub/sub (if needed)
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
 */
const redisUtils = {
    /**
     * Acquire a lock on stock for a variant
     * @param {string} variantId - Product variant ID
     * @param {number} ttlSeconds - Lock TTL in seconds
     * @returns {Promise<string|null>} Lock key if acquired, null otherwise
     */
    async acquireStockLock(variantId, ttlSeconds = 900) {
        const lockKey = `lock_stock_${variantId}`;
        const lockValue = Date.now().toString();

        // SETNX with TTL
        const result = await redis.set(lockKey, lockValue, 'EX', ttlSeconds, 'NX');
        return result === 'OK' ? lockKey : null;
    },

    /**
     * Release a stock lock
     * @param {string} lockKey - Lock key to release
     */
    async releaseStockLock(lockKey) {
        await redis.del(lockKey);
    },

    /**
     * Check if a lock exists
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
     * @param {string} variantId - Product variant ID
     * @returns {Promise<number>} TTL in seconds, -2 if not exists
     */
    async getStockLockTTL(variantId) {
        const lockKey = `lock_stock_${variantId}`;
        return await redis.ttl(lockKey);
    },

    /**
     * Store session data
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
     * @param {string} sessionId - Session ID
     */
    async deleteSession(sessionId) {
        const key = `session_${sessionId}`;
        await redis.del(key);
    },

    /**
     * Cache data with TTL
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     * @param {number} ttlSeconds - TTL in seconds
     */
    async cache(key, data, ttlSeconds = 3600) {
        await redis.setex(`cache_${key}`, ttlSeconds, JSON.stringify(data));
    },

    /**
     * Get cached data
     * @param {string} key - Cache key
     * @returns {Promise<any|null>}
     */
    async getCache(key) {
        const data = await redis.get(`cache_${key}`);
        return data ? JSON.parse(data) : null;
    },

    /**
     * Invalidate cache
     * @param {string} key - Cache key
     */
    async invalidateCache(key) {
        await redis.del(`cache_${key}`);
    },

    /**
     * Invalidate cache by pattern
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

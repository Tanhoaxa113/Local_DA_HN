/**
 * Utility Functions
 */

/**
 * Format price in VND
 * @param {number} price - Price in VND
 * @returns {string} Formatted price string
 */
export function formatPrice(price) {
    if (price === null || price === undefined) return "0₫";
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(price);
}

/**
 * Format number with thousand separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
    if (num === null || num === undefined) return "0";
    return new Intl.NumberFormat("vi-VN").format(num);
}

/**
 * Format date
 * @param {string|Date} date - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
    if (!date) return "";

    const defaultOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
    };

    return new Intl.DateTimeFormat("vi-VN", { ...defaultOptions, ...options }).format(
        new Date(date)
    );
}

/**
 * Format relative time (e.g., "2 giờ trước")
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
    if (!date) return "";

    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now - then) / 1000);

    const intervals = [
        { label: "năm", seconds: 31536000 },
        { label: "tháng", seconds: 2592000 },
        { label: "ngày", seconds: 86400 },
        { label: "giờ", seconds: 3600 },
        { label: "phút", seconds: 60 },
        { label: "giây", seconds: 1 },
    ];

    for (const interval of intervals) {
        const count = Math.floor(diffInSeconds / interval.seconds);
        if (count >= 1) {
            return `${count} ${interval.label} trước`;
        }
    }

    return "Vừa xong";
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + "...";
}

/**
 * Generate slug from text
 * @param {string} text - Text to slugify
 * @returns {string} Slug
 */
export function slugify(text) {
    if (!text) return "";

    // Vietnamese character map
    const from = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ";
    const to = "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiioooooooooooooooooouuuuuuuuuuuyyyyyd";

    let slug = text.toLowerCase();

    for (let i = 0; i < from.length; i++) {
        slug = slug.replace(new RegExp(from.charAt(i), "g"), to.charAt(i));
    }

    return slug
        .replace(/[^a-z0-9 -]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+/, "")
        .replace(/-+$/, "");
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit time in ms
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

/**
 * Classify value into type
 * @param {*} value - Value to classify
 * @returns {string} Type string
 */
export function classNames(...classes) {
    return classes.filter(Boolean).join(" ");
}

/**
 * Get image URL with fallback
 * @param {string} imagePath - Image path
 * @param {string} fallback - Fallback image path
 * @returns {string} Image URL
 */
export function getImageUrl(imagePath, fallback = "/images/placeholder.jpg") {
    if (!imagePath) return fallback;

    // If it's already a full URL, return as is
    if (imagePath.startsWith("http")) return imagePath;

    // If it's a relative path from uploads, prepend API URL (stripping /api suffix if present)
    let apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
    if (apiUrl.endsWith("/api")) {
        apiUrl = apiUrl.slice(0, -4);
    }

    return `${apiUrl}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
}

/**
 * Calculate discount percentage
 * @param {number} originalPrice - Original price
 * @param {number} salePrice - Sale price
 * @returns {number} Discount percentage
 */
export function calculateDiscount(originalPrice, salePrice) {
    if (!originalPrice || !salePrice || originalPrice <= salePrice) return 0;
    return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
}

/**
 * Validate email
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate Vietnamese phone number
 * @param {string} phone - Phone to validate
 * @returns {boolean} Is valid
 */
export function isValidPhone(phone) {
    const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
    return phoneRegex.test(phone);
}

/**
 * Get order status info
 * @param {string} status - Order status
 * @returns {object} Status info with label, color, icon
 */
export function getOrderStatusInfo(status) {
    const statusMap = {
        PENDING_PAYMENT: {
            label: "Chờ thanh toán",
            color: "yellow",
            bgClass: "bg-yellow-100 text-yellow-800",
        },
        PROCESSING_FAILED: {
            label: "Xử lý thất bại",
            color: "red",
            bgClass: "bg-red-100 text-red-800",
        },
        PENDING_CONFIRMATION: {
            label: "Chờ xác nhận",
            color: "blue",
            bgClass: "bg-blue-100 text-blue-800",
        },
        PREPARING: {
            label: "Đang chuẩn bị",
            color: "indigo",
            bgClass: "bg-indigo-100 text-indigo-800",
        },
        READY_TO_SHIP: {
            label: "Sẵn sàng giao",
            color: "purple",
            bgClass: "bg-purple-100 text-purple-800",
        },
        IN_TRANSIT: {
            label: "Đang vận chuyển",
            color: "cyan",
            bgClass: "bg-cyan-100 text-cyan-800",
        },
        OUT_FOR_DELIVERY: {
            label: "Đang giao hàng",
            color: "teal",
            bgClass: "bg-teal-100 text-teal-800",
        },
        DELIVERY_FAILED: {
            label: "Giao thất bại",
            color: "orange",
            bgClass: "bg-orange-100 text-orange-800",
        },
        RETURNED_TO_WAREHOUSE: {
            label: "Đã hoàn kho",
            color: "gray",
            bgClass: "bg-gray-100 text-gray-800",
        },
        DELIVERED: {
            label: "Đã giao hàng",
            color: "green",
            bgClass: "bg-green-100 text-green-800",
        },
        REFUND_REQUESTED: {
            label: "Yêu cầu hoàn tiền",
            color: "pink",
            bgClass: "bg-pink-100 text-pink-800",
        },
        REFUNDING: {
            label: "Đang hoàn tiền",
            color: "amber",
            bgClass: "bg-amber-100 text-amber-800",
        },
        REFUNDED: {
            label: "Đã hoàn tiền",
            color: "slate",
            bgClass: "bg-slate-100 text-slate-800",
        },
        REFUND_CONFIRMED: {
            label: "Đã xác nhận hoàn tiền",
            color: "emerald",
            bgClass: "bg-emerald-100 text-emerald-800",
        },
        COMPLETED: {
            label: "Hoàn thành",
            color: "emerald",
            bgClass: "bg-emerald-100 text-emerald-800",
        },
        CANCELLED: {
            label: "Đã hủy",
            color: "red",
            bgClass: "bg-red-100 text-red-800",
        },
    };

    return statusMap[status] || { label: status, color: "gray", bgClass: "bg-gray-100 text-gray-800" };
}

/**
 * API Configuration
 * Centralized API client for backend communication
 * Cấu hình API Client tập trung để giao tiếp với Backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

/**
 * Custom fetch wrapper with error handling
 * Hàm fetch wrapper có xử lý lỗi tự động
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<object>} API response data
 * @throws {APIError} Nếu request thất bại
 */
async function fetchAPI(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const defaultHeaders = {
        "Content-Type": "application/json",
    };

    // Add auth token if available
    // Tự động thêm Token vào Header nếu có
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("accessToken");
        if (token) {
            defaultHeaders.Authorization = `Bearer ${token}`;
        }
    }

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };

    try {
        const response = await fetch(url, config);

        // Handle non-JSON responses
        // Xử lý response không phải JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new APIError(data.message || "Something went wrong", response.status, data);
        }

        return data;
    } catch (error) {
        console.error("API Request Failed:", {
            url,
            error: error.message,
            cause: error.cause,
            stack: error.stack
        });
        if (error instanceof APIError) {
            throw error;
        }
        throw new APIError(error.message, 500);
    }
}

/**
 * Custom API Error class
 * Class lỗi tùy chỉnh cho API
 */
class APIError extends Error {
    constructor(message, status, data = null) {
        super(message);
        this.name = "APIError";
        this.status = status;
        this.data = data;
    }
}

/**
 * Auth API
 * Các API liên quan đến xác thực (Đăng nhập, Đăng ký...)
 */
export const authAPI = {
    login: (credentials) =>
        fetchAPI("/auth/login", {
            method: "POST",
            body: JSON.stringify(credentials),
        }),

    register: (userData) =>
        fetchAPI("/auth/register", {
            method: "POST",
            body: JSON.stringify(userData),
        }),

    logout: () =>
        fetchAPI("/auth/logout", {
            method: "POST",
        }),

    refreshToken: (refreshToken) =>
        fetchAPI("/auth/refresh-token", {
            method: "POST",
            body: JSON.stringify({ refreshToken }),
        }),

    getProfile: () => fetchAPI("/auth/me"),

    updateProfile: (data) =>
        fetchAPI("/auth/me", {
            method: "PUT",
            body: JSON.stringify(data),
        }),
};

/**
 * Products API
 * Các API liên quan đến sản phẩm
 */
export const productsAPI = {
    // Lấy danh sách sản phẩm (có lọc)
    getAll: (params = {}) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                searchParams.append(key, value);
            }
        });
        const query = searchParams.toString();
        return fetchAPI(`/products${query ? `?${query}` : ""}`);
    },

    // Lấy chi tiết sản phẩm theo Slug
    getBySlug: (slug) => fetchAPI(`/products/${slug}`),

    // Lấy sản phẩm nổi bật
    getFeatured: () => fetchAPI("/products?isFeatured=true&limit=8"),

    // Lấy sản phẩm theo danh mục
    getByCategory: (categorySlug, params = {}) => {
        const searchParams = new URLSearchParams({ category: categorySlug, ...params });
        return fetchAPI(`/products?${searchParams.toString()}`);
    },

    // Admin operations
    // Các thao tác của Admin với sản phẩm
    getById: (id) => fetchAPI(`/admin/products/${id}`),

    // Tạo sản phẩm mới (có upload ảnh)
    create: (formData) =>
        fetch(`${API_BASE_URL}/admin/products`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("accessToken") : ""}`,
            },
            body: formData,
        }).then(res => res.json()),

    // Cập nhật sản phẩm
    update: (id, formData) =>
        fetch(`${API_BASE_URL}/admin/products/${id}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("accessToken") : ""}`,
            },
            body: formData,
        }).then(res => res.json()),

    // Xóa sản phẩm
    delete: (id) =>
        fetchAPI(`/admin/products/${id}`, {
            method: "DELETE",
        }),
};

/**
 * Categories API
 * Các API liên quan đến danh mục
 */
export const categoriesAPI = {
    getAll: () => fetchAPI("/categories"),
    getBySlug: (slug) => fetchAPI(`/categories/${slug}`),
    create: (data) =>
        fetchAPI("/admin/categories", {
            method: "POST",
            body: JSON.stringify(data),
        }),
    update: (id, data) =>
        fetchAPI(`/admin/categories/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        }),
    delete: (id) =>
        fetchAPI(`/admin/categories/${id}`, {
            method: "DELETE",
        }),
};

/**
 * Brands API
 * Các API liên quan đến thương hiệu
 */
export const brandsAPI = {
    getAll: () => fetchAPI("/brands"),
    getBySlug: (slug) => fetchAPI(`/brands/${slug}`),
    create: (data) =>
        fetchAPI("/admin/brands", {
            method: "POST",
            body: JSON.stringify(data),
        }),
    update: (id, data) =>
        fetchAPI(`/admin/brands/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        }),
    delete: (id) =>
        fetchAPI(`/admin/brands/${id}`, {
            method: "DELETE",
        }),
};

/**
 * Cart API
 * Các API liên quan đến giỏ hàng
 */
export const cartAPI = {
    get: () => fetchAPI("/cart"),

    addItem: (variantId, quantity = 1) =>
        fetchAPI("/cart/items", {
            method: "POST",
            body: JSON.stringify({ variantId, quantity }),
        }),

    updateItem: (itemId, quantity) =>
        fetchAPI(`/cart/items/${itemId}`, {
            method: "PUT",
            body: JSON.stringify({ quantity }),
        }),

    removeItem: (itemId) =>
        fetchAPI(`/cart/items/${itemId}`, {
            method: "DELETE",
        }),

    clear: () =>
        fetchAPI("/cart", {
            method: "DELETE",
        }),
};

/**
 * Orders API
 * Các API liên quan đến đơn hàng
 */
export const ordersAPI = {
    create: (orderData) =>
        fetchAPI("/orders", {
            method: "POST",
            body: JSON.stringify(orderData),
        }),

    // For customers - get their own orders
    // Lấy danh sách đơn hàng của user hiện tại
    getMyOrders: (params = {}) => {
        const searchParams = new URLSearchParams(params);
        return fetchAPI(`/orders/my?${searchParams.toString()}`);
    },

    // For admin - get all orders (requires staff role)
    // Admin lấy toàn bộ đơn hàng
    getAll: (params = {}) => {
        const searchParams = new URLSearchParams(params);
        return fetchAPI(`/orders?${searchParams.toString()}`);
    },

    getById: (id) => fetchAPI(`/orders/${id}`),

    getByOrderNumber: (orderNumber) => fetchAPI(`/orders/number/${orderNumber}`),

    cancel: (id, reason) =>
        fetchAPI(`/orders/${id}/cancel`, {
            method: "POST",
            body: JSON.stringify({ reason }),
        }),

    requestRefund: (id, reason) =>
        fetchAPI(`/orders/${id}/refund`, {
            method: "POST",
            body: JSON.stringify({ reason }),
        }),

    confirmReceived: (id) =>
        fetchAPI(`/orders/${id}/confirm`, {
            method: "POST",
        }),

    // Admin operations
    updateStatus: (id, status) =>
        fetchAPI(`/admin/orders/${id}/status`, {
            method: "PUT",
            body: JSON.stringify({ status }),
        }),
};

/**
 * Payment API
 * Các API liên quan đến thanh toán
 */
export const paymentAPI = {
    createVNPayUrl: (orderId) =>
        fetchAPI(`/payment/create`, {
            method: "POST",
            body: JSON.stringify({ orderId }),
        }),

    verifyVNPay: (params) => {
        const searchParams = new URLSearchParams(params);
        return fetchAPI(`/payment/vnpay/return?${searchParams.toString()}`);
    },

    confirmCOD: (orderId) =>
        fetchAPI(`/payment/confirm-cod`, {
            method: "PUT",
            body: JSON.stringify({ orderId }),
        }),
};

/**
 * Address API
 * Các API quản lý địa chỉ giao hàng
 */
export const addressAPI = {
    getAll: () => fetchAPI("/addresses"),

    create: (addressData) =>
        fetchAPI("/addresses", {
            method: "POST",
            body: JSON.stringify(addressData),
        }),

    update: (id, addressData) =>
        fetchAPI(`/addresses/${id}`, {
            method: "PUT",
            body: JSON.stringify(addressData),
        }),

    delete: (id) =>
        fetchAPI(`/addresses/${id}`, {
            method: "DELETE",
        }),

    setDefault: (id) =>
        fetchAPI(`/addresses/${id}/default`, {
            method: "PUT",
        }),
};

/**
 * Location API
 * API lấy thông tin Tỉnh/Thành, Quận/Huyện (API bên thứ 3)
 * Using external API: https://provinces.open-api.vn/
 */
export const locationAPI = {
    getProvinces: () => fetch(`https://provinces.open-api.vn/api/v2/p/`).then(res => res.json()),
    getProvinceDetails: (code) => fetch(`https://provinces.open-api.vn/api/v2/p/${code}?depth=2`).then(res => res.json()),
    // District level removed as per plan, treating second level of external API (wards in p/id?depth=2) as Wards directly or adaptation
    // Actually the API structure is p -> districts -> wards.
    // User request: "https://provinces.open-api.vn/api/v2/p/1 ... trả về sẽ có Wards, ta sẽ lấy wards trong JSON để render Phường/Xã"
    // So we just need getProvinces and getProvinceDetails (which contains the 'wards' - actually they are districts but user calls them wards/wants to map them as wards).
};

/**
 * Loyalty API
 * Các API liên quan đến khách hàng thân thiết
 */
export const loyaltyAPI = {
    getStatus: () => fetchAPI("/loyalty/status"),
    checkDiscount: () => fetchAPI("/loyalty/discount/check"),
    getHistory: () => fetchAPI("/loyalty/history"),
};



/**
 * Users API (Admin)
 * API quản lý người dùng (Dành cho Admin)
 */
export const usersAPI = {
    getAll: (params = {}) => {
        const searchParams = new URLSearchParams(params);
        return fetchAPI(`/admin/users?${searchParams.toString()}`);
    },
    getById: (id) => fetchAPI(`/admin/users/${id}`),
    update: (id, data) =>
        fetchAPI(`/admin/users/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        }),
};

export { fetchAPI, APIError, API_BASE_URL };

/**
 * Auth Validation Schemas
 * Validation schemas for authentication endpoints
 * Schema kiểm tra dữ liệu cho các API xác thực
 */

// Schema đăng ký tài khoản
const registerSchema = {
    body: {
        email: {
            required: true,
            type: 'email',
        },
        password: {
            required: true,
            type: 'password', // Yêu cầu mật khẩu mạnh
        },
        fullName: {
            required: true,
            type: 'string',
            minLength: 2,
            maxLength: 100,
        },
        phone: {
            required: false,
            type: 'phone', // Định dạng số điện thoại VN
        },
    },
};

// Schema đăng nhập
const loginSchema = {
    body: {
        email: {
            required: true,
            type: 'email',
        },
        password: {
            required: true,
            type: 'string',
            minLength: 1,
        },
    },
};

// Schema làm mới token
const refreshSchema = {
    body: {
        refreshToken: {
            required: true,
            type: 'string',
        },
    },
};

// Schema đổi mật khẩu
const changePasswordSchema = {
    body: {
        currentPassword: {
            required: true,
            type: 'string',
            minLength: 1,
        },
        newPassword: {
            required: true,
            type: 'password',
        },
    },
};

// Schema cập nhật thông tin cá nhân
const updateProfileSchema = {
    body: {
        fullName: {
            required: false,
            type: 'string',
            minLength: 2,
            maxLength: 100,
        },
        phone: {
            required: false,
            type: 'phone',
        },
    },
};

module.exports = {
    registerSchema,
    loginSchema,
    refreshSchema,
    changePasswordSchema,
    updateProfileSchema,
};

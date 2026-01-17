/**
 * Auth Validation Schemas
 * Validation schemas for authentication endpoints
 */

const registerSchema = {
    body: {
        email: {
            required: true,
            type: 'email',
        },
        password: {
            required: true,
            type: 'password',
        },
        fullName: {
            required: true,
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

const refreshSchema = {
    body: {
        refreshToken: {
            required: true,
            type: 'string',
        },
    },
};

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

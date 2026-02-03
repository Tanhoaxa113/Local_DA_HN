/**
 * Address Routes
 * Routes for address management and location data
 * Routes quản lý địa chỉ nhận hàng
 */
const express = require('express');
const router = express.Router();

const addressController = require('../controllers/address.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');

// Validation schemas
const createAddressSchema = {
    body: {
        fullName: {
            required: true,
            type: 'string',
            minLength: 2,
            maxLength: 100,
        },
        phone: {
            required: true,
            type: 'phone',
        },
        provinceId: {
            required: true,
            type: 'integer',
        },
        provinceName: {
            required: true,
            type: 'string',
        },
        wardId: {
            required: true,
            type: 'integer',
        },
        wardName: {
            required: true,
            type: 'string',
        },
        streetAddress: {
            required: true,
            type: 'string',
            minLength: 5,
            maxLength: 200,
        },
        isDefault: {
            required: false,
            type: 'boolean',
        },
    },
};

const updateAddressSchema = {
    params: {
        id: {
            required: true,
            type: 'integer',
        },
    },
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
        provinceId: {
            required: false,
            type: 'integer',
        },
        provinceName: {
            required: false,
            type: 'string',
        },
        wardId: {
            required: false,
            type: 'integer',
        },
        wardName: {
            required: false,
            type: 'string',
        },
        streetAddress: {
            required: false,
            type: 'string',
            minLength: 5,
            maxLength: 200,
        },
        isDefault: {
            required: false,
            type: 'boolean',
        },
    },
};

/**
 * Protected routes - User addresses
 * Routes bảo mật - Quản lý địa chỉ cá nhân
 */

// GET /api/addresses - Get user's addresses
// Lấy danh sách địa chỉ của tôi
router.get('/', authenticate, addressController.getMyAddresses);

// GET /api/addresses/:id - Get address by ID
// Lấy chi tiết địa chỉ
router.get('/:id', authenticate, addressController.getById);

// POST /api/addresses - Create address
// Thêm địa chỉ mới
router.post('/', authenticate, validate(createAddressSchema), addressController.create);

// PUT /api/addresses/:id - Update address
// Cập nhật địa chỉ
router.put('/:id', authenticate, validate(updateAddressSchema), addressController.update);

// DELETE /api/addresses/:id - Delete address
// Xóa địa chỉ
router.delete('/:id', authenticate, addressController.remove);

// POST /api/addresses/:id/default - Set as default
// Đặt làm địa chỉ mặc định
router.post('/:id/default', authenticate, addressController.setDefault);

module.exports = router;

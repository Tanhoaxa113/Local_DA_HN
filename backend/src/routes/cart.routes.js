/**
 * Cart Routes
 * Routes for shopping cart management
 * Routes quản lý giỏ hàng
 */
const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cart.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
    addToCartSchema,
    updateCartItemSchema,
} = require('../validators/order.validator');

/**
 * All cart routes require authentication
 * Cần đăng nhập để sử dụng giỏ hàng
 */
router.use(authenticate);

// GET /api/cart - Get current cart
// Xem giỏ hàng hiện tại
router.get('/', cartController.getCart);

// GET /api/cart/validate - Validate cart for checkout
// Kiểm tra giỏ hàng trước khi thanh toán (Check tồn kho, giá thay đổi...)
router.get('/validate', cartController.validateForCheckout);

// POST /api/cart/items - Add item to cart
// Thêm sản phẩm vào giỏ
router.post('/items', validate(addToCartSchema), cartController.addItem);

// PUT /api/cart/items/:itemId - Update cart item quantity
// Cập nhật số lượng item trong giỏ
router.put('/items/:itemId', validate(updateCartItemSchema), cartController.updateItem);

// DELETE /api/cart/items/:itemId - Remove item from cart
// Xóa item khỏi giỏ
router.delete('/items/:itemId', cartController.removeItem);

// DELETE /api/cart - Clear cart
// Làm trống giỏ hàng (Xóa hết)
router.delete('/', cartController.clearCart);

module.exports = router;

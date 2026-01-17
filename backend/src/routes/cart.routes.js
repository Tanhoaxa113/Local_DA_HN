/**
 * Cart Routes
 * Routes for shopping cart management
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
 */
router.use(authenticate);

// GET /api/cart - Get current cart
router.get('/', cartController.getCart);

// GET /api/cart/validate - Validate cart for checkout
router.get('/validate', cartController.validateForCheckout);

// POST /api/cart/items - Add item to cart
router.post('/items', validate(addToCartSchema), cartController.addItem);

// PUT /api/cart/items/:itemId - Update cart item quantity
router.put('/items/:itemId', validate(updateCartItemSchema), cartController.updateItem);

// DELETE /api/cart/items/:itemId - Remove item from cart
router.delete('/items/:itemId', cartController.removeItem);

// DELETE /api/cart - Clear cart
router.delete('/', cartController.clearCart);

module.exports = router;

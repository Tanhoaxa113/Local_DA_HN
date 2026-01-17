/**
 * Cart Controller
 * Handles HTTP requests for cart endpoints
 */
const cartService = require('../services/cart.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/response');

/**
 * Get current user's cart
 * GET /api/cart
 */
const getCart = asyncHandler(async (req, res) => {
    const cart = await cartService.getCart(req.user.id);

    sendSuccess(res, cart, 'Cart retrieved successfully');
});

/**
 * Add item to cart
 * POST /api/cart/items
 */
const addItem = asyncHandler(async (req, res) => {
    const { variantId, quantity } = req.body;

    const cart = await cartService.addItem(
        req.user.id,
        parseInt(variantId, 10),
        quantity ? parseInt(quantity, 10) : 1
    );

    sendCreated(res, cart, 'Item added to cart');
});

/**
 * Update cart item quantity
 * PUT /api/cart/items/:itemId
 */
const updateItem = asyncHandler(async (req, res) => {
    const { quantity } = req.body;

    const cart = await cartService.updateItem(
        req.user.id,
        parseInt(req.params.itemId, 10),
        parseInt(quantity, 10)
    );

    sendSuccess(res, cart, 'Cart item updated');
});

/**
 * Remove item from cart
 * DELETE /api/cart/items/:itemId
 */
const removeItem = asyncHandler(async (req, res) => {
    const cart = await cartService.removeItem(
        req.user.id,
        parseInt(req.params.itemId, 10)
    );

    sendSuccess(res, cart, 'Item removed from cart');
});

/**
 * Clear cart
 * DELETE /api/cart
 */
const clearCart = asyncHandler(async (req, res) => {
    const cart = await cartService.clearCart(req.user.id);

    sendSuccess(res, cart, 'Cart cleared');
});

/**
 * Validate cart for checkout
 * GET /api/cart/validate
 */
const validateForCheckout = asyncHandler(async (req, res) => {
    const result = await cartService.validateForCheckout(req.user.id);

    sendSuccess(res, result, result.valid ? 'Cart is valid for checkout' : 'Cart has issues');
});

module.exports = {
    getCart,
    addItem,
    updateItem,
    removeItem,
    clearCart,
    validateForCheckout,
};

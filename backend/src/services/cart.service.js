/**
 * Cart Service
 * Handles shopping cart operations
 */
const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');

/**
 * Get or create cart for user
 * @param {number} userId - User ID
 * @returns {Promise<object>} Cart with items
 */
const getOrCreateCart = async (userId) => {
    let cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
            items: {
                include: {
                    variant: {
                        include: {
                            product: {
                                include: {
                                    images: {
                                        orderBy: [
                                            { isPrimary: 'desc' },
                                            { sortOrder: 'asc' }
                                        ],
                                        take: 1,
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            },
        },
    });

    if (!cart) {
        cart = await prisma.cart.create({
            data: { userId },
            include: {
                items: [],
            },
        });
    }

    return cart;
};

/**
 * Get cart with calculated totals
 * @param {number} userId - User ID
 * @returns {Promise<object>} Cart with items and totals
 */
const getCart = async (userId) => {
    const cart = await getOrCreateCart(userId);

    // Calculate totals
    let subtotal = 0;
    let itemCount = 0;
    const items = cart.items.map((item) => {
        const lineTotal = Number(item.variant.price) * item.quantity;
        subtotal += lineTotal;
        itemCount += item.quantity;

        return {
            id: item.id,
            quantity: item.quantity,
            variant: {
                id: item.variant.id,
                sku: item.variant.sku,
                size: item.variant.size,
                color: item.variant.color,
                colorCode: item.variant.colorCode,
                price: item.variant.price,
                compareAtPrice: item.variant.compareAtPrice,
                availableStock: item.variant.availableStock,
                isActive: item.variant.isActive,
            },
            product: {
                id: item.variant.product.id,
                name: item.variant.product.name,
                slug: item.variant.product.slug,
                image: item.variant.product.images[0]?.url || null,
            },
            lineTotal,
            isAvailable: item.variant.isActive && item.variant.availableStock >= item.quantity,
        };
    });

    return {
        id: cart.id,
        items,
        itemCount,
        subtotal,
    };
};

/**
 * Add item to cart
 * @param {number} userId - User ID
 * @param {number} variantId - Product variant ID
 * @param {number} quantity - Quantity to add
 * @returns {Promise<object>} Updated cart
 */
const addItem = async (userId, variantId, quantity = 1) => {
    // Validate variant exists and is active
    const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        include: { product: true },
    });

    if (!variant) {
        throw new ApiError(404, 'Product variant not found');
    }

    if (!variant.isActive || !variant.product.isActive) {
        throw new ApiError(400, 'Product is not available');
    }

    if (variant.availableStock < quantity) {
        throw new ApiError(400, `Insufficient stock. Available: ${variant.availableStock}`);
    }

    // Get or create cart
    const cart = await getOrCreateCart(userId);

    // Check if item already in cart
    const existingItem = await prisma.cartItem.findUnique({
        where: {
            cartId_variantId: {
                cartId: cart.id,
                variantId,
            },
        },
    });

    if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;

        if (variant.availableStock < newQuantity) {
            throw new ApiError(400, `Cannot add more. Maximum available: ${variant.availableStock}`);
        }

        await prisma.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: newQuantity },
        });
    } else {
        await prisma.cartItem.create({
            data: {
                cartId: cart.id,
                variantId,
                quantity,
            },
        });
    }

    return getCart(userId);
};

/**
 * Update cart item quantity
 * @param {number} userId - User ID
 * @param {number} itemId - Cart item ID
 * @param {number} quantity - New quantity
 * @returns {Promise<object>} Updated cart
 */
const updateItem = async (userId, itemId, quantity) => {
    const cart = await getOrCreateCart(userId);

    const item = await prisma.cartItem.findFirst({
        where: {
            id: itemId,
            cartId: cart.id,
        },
        include: { variant: true },
    });

    if (!item) {
        throw new ApiError(404, 'Cart item not found');
    }

    if (quantity <= 0) {
        // Remove item
        await prisma.cartItem.delete({ where: { id: itemId } });
    } else {
        // Check stock
        if (item.variant.availableStock < quantity) {
            throw new ApiError(400, `Insufficient stock. Available: ${item.variant.availableStock}`);
        }

        await prisma.cartItem.update({
            where: { id: itemId },
            data: { quantity },
        });
    }

    return getCart(userId);
};

/**
 * Remove item from cart
 * @param {number} userId - User ID
 * @param {number} itemId - Cart item ID
 * @returns {Promise<object>} Updated cart
 */
const removeItem = async (userId, itemId) => {
    const cart = await getOrCreateCart(userId);

    const item = await prisma.cartItem.findFirst({
        where: {
            id: itemId,
            cartId: cart.id,
        },
    });

    if (!item) {
        throw new ApiError(404, 'Cart item not found');
    }

    await prisma.cartItem.delete({ where: { id: itemId } });

    return getCart(userId);
};

/**
 * Clear all items from cart
 * @param {number} userId - User ID
 * @returns {Promise<object>} Empty cart
 */
const clearCart = async (userId) => {
    const cart = await getOrCreateCart(userId);

    await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
    });

    return getCart(userId);
};

/**
 * Validate cart items for checkout
 * Checks stock availability and product status
 * @param {number} userId - User ID
 * @returns {Promise<object>} Validation result
 */
const validateForCheckout = async (userId) => {
    const cart = await getCart(userId);

    if (cart.items.length === 0) {
        throw new ApiError(400, 'Cart is empty');
    }

    const issues = [];

    for (const item of cart.items) {
        if (!item.isAvailable) {
            if (!item.variant.isActive) {
                issues.push({
                    itemId: item.id,
                    variantId: item.variant.id,
                    issue: 'Product is no longer available',
                });
            } else if (item.variant.availableStock < item.quantity) {
                issues.push({
                    itemId: item.id,
                    variantId: item.variant.id,
                    issue: `Insufficient stock. Available: ${item.variant.availableStock}`,
                    availableStock: item.variant.availableStock,
                });
            }
        }
    }

    return {
        valid: issues.length === 0,
        cart,
        issues,
    };
};

module.exports = {
    getCart,
    addItem,
    updateItem,
    removeItem,
    clearCart,
    validateForCheckout,
    getOrCreateCart,
};

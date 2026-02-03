"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { cartAPI } from "@/lib/api";
import { useAuth } from "./AuthContext";

const CartContext = createContext({});

export function CartProvider({ children }) {
    const { isAuthenticated, user } = useAuth();
    const [cart, setCart] = useState({ items: [], total: 0, itemCount: 0 });
    const [loading, setLoading] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Fetch cart when user authenticates
    // Lấy giỏ hàng khi người dùng đã đăng nhập hoặc dùng LocalStorage nếu chưa
    useEffect(() => {
        if (isAuthenticated) {
            fetchCart();
        } else {
            // Load from localStorage for guest users
            loadGuestCart();
        }
    }, [isAuthenticated]);

    const loadGuestCart = () => {
        try {
            const savedCart = localStorage.getItem("guestCart");
            if (savedCart) {
                setCart(JSON.parse(savedCart));
            }
        } catch (err) {
            console.error("Failed to load guest cart:", err);
        }
    };

    const saveGuestCart = (cartData) => {
        try {
            localStorage.setItem("guestCart", JSON.stringify(cartData));
        } catch (err) {
            console.error("Failed to save guest cart:", err);
        }
    };

    const fetchCart = async () => {
        if (!isAuthenticated) return;

        setLoading(true);
        try {
            const response = await cartAPI.get();
            if (response.success) {
                const cartData = response.data;
                setCart({
                    items: cartData.items || [],
                    total: calculateTotal(cartData.items || []),
                    itemCount: calculateItemCount(cartData.items || []),
                });
            }
        } catch (err) {
            console.error("Failed to fetch cart:", err);
        } finally {
            setLoading(false);
        }
    };

    const calculateTotal = (items) => {
        return items.reduce((sum, item) => {
            const price = parseFloat(item.variant?.price || 0);
            return sum + price * item.quantity;
        }, 0);
    };

    const calculateItemCount = (items) => {
        return items.reduce((sum, item) => sum + item.quantity, 0);
    };

    const addItem = useCallback(
        async (variantId, quantity = 1, productInfo = null) => {
            if (isAuthenticated) {
                // Authenticated user - use API
                // Người dùng đã đăng nhập - Gọi API
                try {
                    setLoading(true);
                    const response = await cartAPI.addItem(variantId, quantity);
                    if (response.success) {
                        await fetchCart();
                        setIsCartOpen(true);
                        return { success: true };
                    }
                    throw new Error(response.message);
                } catch (err) {
                    console.error("Failed to add item:", err);
                    return { success: false, error: err.message };
                } finally {
                    setLoading(false);
                }
            } else {
                // Guest user - use localStorage
                // Khách vãng lai - Lưu vào LocalStorage
                const existingIndex = cart.items.findIndex(
                    (item) => item.variantId === variantId
                );

                let newItems;
                if (existingIndex >= 0) {
                    newItems = cart.items.map((item, index) =>
                        index === existingIndex
                            ? { ...item, quantity: item.quantity + quantity }
                            : item
                    );
                } else {
                    newItems = [
                        ...cart.items,
                        {
                            id: Date.now(),
                            variantId,
                            quantity,
                            variant: productInfo,
                        },
                    ];
                }

                const newCart = {
                    items: newItems,
                    total: calculateTotal(newItems),
                    itemCount: calculateItemCount(newItems),
                };

                setCart(newCart);
                saveGuestCart(newCart);
                setIsCartOpen(true);
                return { success: true };
            }
        },
        [isAuthenticated, cart.items]
    );

    const updateItem = useCallback(
        async (itemId, quantity) => {
            if (quantity < 1) {
                return removeItem(itemId);
            }

            if (isAuthenticated) {
                try {
                    setLoading(true);
                    const response = await cartAPI.updateItem(itemId, quantity);
                    if (response.success) {
                        await fetchCart();
                        return { success: true };
                    }
                    throw new Error(response.message);
                } catch (err) {
                    console.error("Failed to update item:", err);
                    return { success: false, error: err.message };
                } finally {
                    setLoading(false);
                }
            } else {
                const newItems = cart.items.map((item) =>
                    item.id === itemId ? { ...item, quantity } : item
                );

                const newCart = {
                    items: newItems,
                    total: calculateTotal(newItems),
                    itemCount: calculateItemCount(newItems),
                };

                setCart(newCart);
                saveGuestCart(newCart);
                return { success: true };
            }
        },
        [isAuthenticated, cart.items]
    );

    const removeItem = useCallback(
        async (itemId) => {
            if (isAuthenticated) {
                try {
                    setLoading(true);
                    const response = await cartAPI.removeItem(itemId);
                    if (response.success) {
                        await fetchCart();
                        return { success: true };
                    }
                    throw new Error(response.message);
                } catch (err) {
                    console.error("Failed to remove item:", err);
                    return { success: false, error: err.message };
                } finally {
                    setLoading(false);
                }
            } else {
                const newItems = cart.items.filter((item) => item.id !== itemId);

                const newCart = {
                    items: newItems,
                    total: calculateTotal(newItems),
                    itemCount: calculateItemCount(newItems),
                };

                setCart(newCart);
                saveGuestCart(newCart);
                return { success: true };
            }
        },
        [isAuthenticated, cart.items]
    );

    const clearCart = useCallback(async () => {
        if (isAuthenticated) {
            try {
                setLoading(true);
                const response = await cartAPI.clear();
                if (response.success) {
                    setCart({ items: [], total: 0, itemCount: 0 });
                    return { success: true };
                }
                throw new Error(response.message);
            } catch (err) {
                console.error("Failed to clear cart:", err);
                return { success: false, error: err.message };
            } finally {
                setLoading(false);
            }
        } else {
            const emptyCart = { items: [], total: 0, itemCount: 0 };
            setCart(emptyCart);
            saveGuestCart(emptyCart);
            return { success: true };
        }
    }, [isAuthenticated]);

    const openCart = useCallback(() => setIsCartOpen(true), []);
    const closeCart = useCallback(() => setIsCartOpen(false), []);
    const toggleCart = useCallback(() => setIsCartOpen((prev) => !prev), []);

    const value = {
        cart,
        loading,
        isCartOpen,
        addItem,
        updateItem,
        removeItem,
        clearCart,
        fetchCart,
        openCart,
        closeCart,
        toggleCart,
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}

export default CartContext;

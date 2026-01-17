"use client";

import { useCart } from "@/context/CartContext";
import { formatPrice, getImageUrl } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

const CloseIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const MinusIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
);

const PlusIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

const ShoppingBagIcon = () => (
    <svg className="w-16 h-16 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);

export default function CartDrawer() {
    const { cart, isCartOpen, closeCart, updateItem, removeItem, loading } = useCart();

    if (!isCartOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50 z-50 animate-fade-in"
                onClick={closeCart}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card z-50 flex flex-col animate-slide-in-right shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">
                        Giỏ hàng ({cart.itemCount})
                    </h2>
                    <button
                        onClick={closeCart}
                        className="p-2 text-muted hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto">
                    {cart.items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <ShoppingBagIcon />
                            <h3 className="mt-4 text-lg font-medium text-foreground">
                                Giỏ hàng trống
                            </h3>
                            <p className="mt-2 text-sm text-muted">
                                Hãy thêm sản phẩm vào giỏ hàng để tiếp tục mua sắm
                            </p>
                            <button
                                onClick={closeCart}
                                className="btn btn-primary mt-6"
                            >
                                Tiếp tục mua sắm
                            </button>
                        </div>
                    ) : (
                        <ul className="divide-y divide-border">
                            {cart.items.map((item) => (
                                <CartItem
                                    key={item.id}
                                    item={item}
                                    onUpdateQuantity={(quantity) => updateItem(item.id, quantity)}
                                    onRemove={() => removeItem(item.id)}
                                    loading={loading}
                                />
                            ))}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                {cart.items.length > 0 && (
                    <div className="border-t border-border p-4 space-y-4 bg-card">
                        {/* Subtotal */}
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted">Tạm tính</span>
                            <span className="font-medium text-foreground">
                                {formatPrice(cart.total)}
                            </span>
                        </div>

                        {/* Shipping note */}
                        <p className="text-xs text-muted text-center">
                            Phí vận chuyển sẽ được tính ở bước thanh toán
                        </p>

                        {/* Actions */}
                        <div className="space-y-2">
                            <Link
                                href="/checkout"
                                onClick={closeCart}
                                className="btn btn-primary w-full text-center"
                            >
                                Thanh toán
                            </Link>
                            <Link
                                href="/cart"
                                onClick={closeCart}
                                className="btn btn-outline w-full text-center"
                            >
                                Xem giỏ hàng
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

function CartItem({ item, onUpdateQuantity, onRemove, loading }) {
    const variant = item.variant;
    // Handle both API response formats (mapped vs raw)
    const product = item.product || variant?.product;

    const imageUrl = getImageUrl(
        product?.image || product?.images?.[0]?.url || variant?.images?.[0]?.url,
        "/images/placeholder.jpg"
    );

    const productName = product?.name || variant?.productName || "Sản phẩm";
    const variantInfo = variant?.size && variant?.color
        ? `${variant.size} / ${variant.color}`
        : variant?.variantInfo || "";

    return (
        <li className="p-4 flex gap-4">
            {/* Product Image */}
            <div className="relative w-20 h-24 bg-secondary rounded-lg overflow-hidden flex-shrink-0">
                <Image
                    src={imageUrl}
                    alt={productName}
                    fill
                    className="object-cover"
                    sizes="80px"
                    unoptimized
                />
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground line-clamp-2">
                    {productName}
                </h4>
                {variantInfo && (
                    <p className="text-xs text-muted mt-1">{variantInfo}</p>
                )}
                <p className="text-sm font-semibold text-foreground mt-1">
                    {formatPrice(variant?.price || 0)}
                </p>

                {/* Quantity Controls */}
                <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-border rounded-lg">
                        <button
                            onClick={() => onUpdateQuantity(item.quantity - 1)}
                            disabled={loading || item.quantity <= 1}
                            className="p-2 text-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <MinusIcon />
                        </button>
                        <span className="w-10 text-center text-sm font-medium text-foreground">
                            {item.quantity}
                        </span>
                        <button
                            onClick={() => onUpdateQuantity(item.quantity + 1)}
                            disabled={loading}
                            className="p-2 text-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <PlusIcon />
                        </button>
                    </div>

                    {/* Remove Button */}
                    <button
                        onClick={onRemove}
                        disabled={loading}
                        className="p-2 text-muted hover:text-error transition-colors disabled:opacity-50"
                        aria-label="Remove item"
                    >
                        <TrashIcon />
                    </button>
                </div>
            </div>
        </li>
    );
}

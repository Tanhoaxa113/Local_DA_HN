"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { formatPrice, getImageUrl } from "@/lib/utils";

// Icons
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
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

const ShoppingBagIcon = () => (
    <svg className="w-20 h-20 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.75} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);

const ArrowLeftIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

const LockIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
);

/**
 * Cart Page Component
 * Trang Giỏ hàng
 * 
 * Chức năng:
 * - Hiển thị danh sách sản phẩm đã thêm
 * - Cập nhật số lượng, xóa sản phẩm
 * - Tính toán tổng tiền
 * - Chuyển hướng đến trang thanh toán
 */
export default function CartPage() {
    const { cart, updateItem, removeItem, clearCart, loading } = useCart();
    const { isAuthenticated } = useAuth();

    // Calculate totals
    // Tính toán tổng tiền
    const subtotal = cart.total;
    const shippingFee = 0; // Tạm tính bằng 0
    const total = subtotal + shippingFee;
    const freeShippingRemaining = 0; // Logic freeship (nếu có)

    // Empty cart state
    // Trạng thái giỏ hàng trống
    if (cart.items.length === 0) {
        return (
            <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center py-16 px-4">
                <ShoppingBagIcon />
                <h1 className="text-2xl font-bold text-foreground mt-6 mb-2">
                    Giỏ hàng trống
                </h1>
                <p className="text-muted text-center max-w-sm mb-8">
                    Hãy thêm sản phẩm vào giỏ hàng để tiếp tục mua sắm
                </p>
                <Link
                    href="/products"
                    className="btn btn-primary inline-flex items-center gap-2"
                >
                    <ArrowLeftIcon />
                    Tiếp tục mua sắm
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-secondary">
            {/* Header */}
            <div className="bg-background py-8 border-b border-border">
                <div className="container">
                    <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                        Giỏ hàng ({cart.itemCount} sản phẩm)
                    </h1>
                </div>
            </div>

            <div className="container py-8">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Cart Items */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Free Shipping Progress */}


                        {/* Cart Items */}
                        <div className="bg-card rounded-xl border border-border overflow-hidden">
                            <table className="w-full">
                                <thead className="hidden lg:table-header-group">
                                    <tr className="border-b border-border">
                                        <th className="text-left text-sm font-medium text-muted p-4">
                                            Sản phẩm
                                        </th>
                                        <th className="text-center text-sm font-medium text-muted p-4 w-32">
                                            Giá
                                        </th>
                                        <th className="text-center text-sm font-medium text-muted p-4 w-40">
                                            Số lượng
                                        </th>
                                        <th className="text-right text-sm font-medium text-muted p-4 w-32">
                                            Tổng
                                        </th>
                                        <th className="p-4 w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {cart.items.map((item) => (
                                        <CartItemRow
                                            key={item.id}
                                            item={item}
                                            onUpdateQuantity={(quantity) => updateItem(item.id, quantity)}
                                            onRemove={() => removeItem(item.id)}
                                            loading={loading}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-between">
                            <Link
                                href="/products"
                                className="btn btn-outline inline-flex items-center justify-center gap-2"
                            >
                                <ArrowLeftIcon />
                                Tiếp tục mua sắm
                            </Link>
                            <button
                                onClick={() => clearCart()}
                                disabled={loading}
                                className="px-6 py-3 text-error hover:bg-error/10 font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                Xóa giỏ hàng
                            </button>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-card rounded-xl border border-border p-6 sticky top-24">
                            <h2 className="text-lg font-semibold text-foreground mb-6">
                                Tóm tắt đơn hàng
                            </h2>

                            <div className="space-y-4">
                                {/* Subtotal */}
                                <div className="flex items-center justify-between">
                                    <span className="text-muted">Tạm tính</span>
                                    <span className="font-medium text-foreground">
                                        {formatPrice(subtotal)}
                                    </span>
                                </div>

                                {/* Shipping */}
                                <div className="flex items-center justify-between">
                                    <span className="text-muted">Phí vận chuyển</span>
                                    <span className={shippingFee === 0 ? "text-success font-medium" : "text-foreground"}>
                                        {shippingFee === 0 ? "Miễn phí" : formatPrice(shippingFee)}
                                    </span>
                                </div>

                                {/* Discount Code */}
                                <div className="pt-4 border-t border-border">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Mã giảm giá"
                                            className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:border-accent"
                                        />
                                        <button className="btn btn-secondary">
                                            Áp dụng
                                        </button>
                                    </div>
                                </div>

                                {/* Total */}
                                <div className="pt-4 border-t border-border">
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-semibold text-foreground">Tổng cộng</span>
                                        <span className="text-xl font-bold text-accent">
                                            {formatPrice(total)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted mt-1">
                                        (Đã bao gồm VAT nếu có)
                                    </p>
                                </div>

                                {/* Checkout Button */}
                                {isAuthenticated ? (
                                    <Link
                                        href="/checkout"
                                        className="btn btn-primary w-full text-center"
                                    >
                                        Tiến hành thanh toán
                                    </Link>
                                ) : (
                                    <div className="space-y-3">
                                        <Link
                                            href="/login?redirect=/checkout"
                                            className="btn btn-primary w-full text-center"
                                        >
                                            Đăng nhập để thanh toán
                                        </Link>
                                        <Link
                                            href="/checkout"
                                            className="btn btn-outline w-full text-center"
                                        >
                                            Mua hàng không cần đăng nhập
                                        </Link>
                                    </div>
                                )}

                                {/* Trust Badges */}
                                <div className="pt-4 border-t border-border">
                                    <div className="flex items-center justify-center gap-2 text-xs text-muted">
                                        <LockIcon />
                                        <span>Thanh toán an toàn & bảo mật</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CartItemRow({ item, onUpdateQuantity, onRemove, loading }) {
    const variant = item.variant;
    const product = variant?.product;

    const imageUrl = getImageUrl(
        product?.images?.[0]?.url || variant?.images?.[0]?.url,
        "/images/placeholder.jpg"
    );

    const productName = product?.name || variant?.productName || "Sản phẩm";
    const variantInfo = variant?.size && variant?.color
        ? `${variant.size} / ${variant.color}`
        : variant?.variantInfo || "";

    const price = parseFloat(variant?.price || 0);
    const itemTotal = price * item.quantity;

    return (
        <tr className="flex flex-col lg:table-row p-4 lg:p-0">
            {/* Product */}
            <td className="lg:p-4">
                <div className="flex gap-4">
                    <Link href={`/products/${product?.slug || ""}`} className="flex-shrink-0">
                        <div className="relative w-20 h-24 lg:w-24 lg:h-28 bg-secondary rounded-lg overflow-hidden">
                            <Image
                                src={imageUrl}
                                alt={productName}
                                fill
                                className="object-cover hover:scale-105 transition-transform"
                                sizes="96px"
                            />
                        </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                        <Link href={`/products/${product?.slug || ""}`}>
                            <h3 className="font-medium text-foreground hover:text-accent transition-colors line-clamp-2">
                                {productName}
                            </h3>
                        </Link>
                        {variantInfo && (
                            <p className="text-sm text-muted mt-1">{variantInfo}</p>
                        )}
                        {variant?.sku && (
                            <p className="text-xs text-muted mt-1">SKU: {variant.sku}</p>
                        )}

                        {/* Mobile Price */}
                        <p className="text-sm font-semibold text-foreground mt-2 lg:hidden">
                            {formatPrice(price)}
                        </p>
                    </div>
                </div>
            </td>

            {/* Price - Desktop */}
            <td className="hidden lg:table-cell text-center p-4">
                <span className="font-medium text-foreground">
                    {formatPrice(price)}
                </span>
            </td>

            {/* Quantity */}
            <td className="lg:text-center lg:p-4 mt-4 lg:mt-0">
                <div className="flex items-center justify-between lg:justify-center gap-4">
                    <span className="text-sm text-muted lg:hidden">Số lượng:</span>
                    <div className="flex items-center border border-border rounded-lg">
                        <button
                            onClick={() => onUpdateQuantity(item.quantity - 1)}
                            disabled={loading || item.quantity <= 1}
                            className="p-2 text-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <MinusIcon />
                        </button>
                        <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => onUpdateQuantity(parseInt(e.target.value) || 1)}
                            className="w-12 text-center bg-transparent border-none focus:outline-none text-foreground font-medium"
                        />
                        <button
                            onClick={() => onUpdateQuantity(item.quantity + 1)}
                            disabled={loading}
                            className="p-2 text-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <PlusIcon />
                        </button>
                    </div>
                </div>
            </td>

            {/* Total - Desktop */}
            <td className="hidden lg:table-cell text-right p-4">
                <span className="font-semibold text-foreground">
                    {formatPrice(itemTotal)}
                </span>
            </td>

            {/* Remove */}
            <td className="lg:p-4 mt-4 lg:mt-0">
                <div className="flex items-center justify-between lg:justify-end">
                    {/* Mobile Total */}
                    <div className="lg:hidden">
                        <span className="text-sm text-muted">Tổng: </span>
                        <span className="font-semibold text-foreground">
                            {formatPrice(itemTotal)}
                        </span>
                    </div>

                    <button
                        onClick={onRemove}
                        disabled={loading}
                        className="p-2 text-muted hover:text-error transition-colors disabled:opacity-50"
                        aria-label="Remove item"
                    >
                        <TrashIcon />
                    </button>
                </div>
            </td>
        </tr>
    );
}

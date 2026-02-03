"use client";

import Link from "next/link";
import Image from "next/image";
import { formatPrice, calculateDiscount, getImageUrl } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { useState } from "react";

const HeartIcon = ({ filled }) => (
    <svg
        className={`w-5 h-5 ${filled ? "fill-red-500 text-red-500" : "fill-none text-current"}`}
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
    </svg>
);

const ShoppingBagIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
        />
    </svg>
);

const EyeIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
        />
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
    </svg>
);

export default function ProductCard({ product, variant = "default" }) {
    const { addItem } = useCart();
    const [isHovered, setIsHovered] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    // Get primary image
    // Lấy ảnh đại diện chính của sản phẩm
    const primaryImage = product.images?.find((img) => img.isPrimary) || product.images?.[0];
    const secondaryImage = product.images?.find((img) => !img.isPrimary && img !== primaryImage);

    const imageUrl = getImageUrl(primaryImage?.url, "/images/placeholder.jpg");
    // Show secondary image on hover if available
    // Hiển thị ảnh thứ 2 khi hover nếu có
    const hoverImageUrl = secondaryImage
        ? getImageUrl(secondaryImage.url, imageUrl)
        : imageUrl;

    // Get price info from first variant
    // Lấy thông tin giá từ biến thể đầu tiên
    const firstVariant = product.variants?.[0];
    const price = firstVariant?.price || 0;
    const compareAtPrice = firstVariant?.compareAtPrice;
    const isOnSale = compareAtPrice && parseFloat(compareAtPrice) > parseFloat(price);
    const discountPercent = isOnSale
        ? calculateDiscount(parseFloat(compareAtPrice), parseFloat(price))
        : 0;

    // Check stock
    // Kiểm tra tồn kho (còn hàng nếu ít nhất 1 biến thể còn > 0)
    const inStock = product.variants?.some((v) => v.availableStock > 0);

    // Handle quick add to cart
    // Xử lý thêm nhanh vào giỏ hàng
    const handleQuickAdd = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!firstVariant || !inStock) return;

        setIsAdding(true);
        await addItem(firstVariant.id, 1, {
            ...firstVariant,
            product: { name: product.name, images: product.images },
        });
        setIsAdding(false);
    };

    return (
        <div
            className={`group product-card bg-card rounded-xl overflow-hidden border border-border ${variant === "featured" ? "shadow-md" : ""
                }`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Image Container */}
            <Link href={`/products/${product.slug}`} className="block relative aspect-product overflow-hidden">
                {/* Main Image */}
                <Image
                    src={getImageUrl(product.images?.[0]?.url)}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    unoptimized
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {isOnSale && (
                        <span className="badge badge-error">
                            -{discountPercent}%
                        </span>
                    )}
                    {product.isFeatured && (
                        <span className="badge badge-accent">
                            Nổi bật
                        </span>
                    )}
                    {!inStock && (
                        <span className="badge badge-primary">
                            Hết hàng
                        </span>
                    )}
                </div>



                {/* Quick Actions */}
                <div className="absolute bottom-3 left-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <button
                        onClick={handleQuickAdd}
                        disabled={!inStock || isAdding}
                        className={`flex-1 btn ${inStock
                            ? "btn-primary"
                            : "bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted"
                            }`}
                    >
                        {isAdding ? (
                            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <ShoppingBagIcon />
                                <span className="hidden sm:inline">Thêm giỏ hàng</span>
                            </>
                        )}
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.location.href = `/products/${product.slug}`;
                        }}
                        className="p-2.5 bg-white text-foreground rounded-lg hover:bg-accent hover:text-white transition-colors"
                        aria-label="Quick view"
                    >
                        <EyeIcon />
                    </button>
                </div>
            </Link>

            {/* Product Info */}
            <div className="p-4">
                {/* Brand */}
                {product.brand && (
                    <p className="text-xs text-muted uppercase tracking-wider mb-1">
                        {product.brand.name}
                    </p>
                )}

                {/* Name */}
                <Link href={`/products/${product.slug}`}>
                    <h3 className="font-medium text-foreground line-clamp-2 hover:text-accent transition-colors">
                        {product.name}
                    </h3>
                </Link>

                {/* Variants Preview */}
                {product.variants && product.variants.length > 1 && (
                    <div className="flex items-center gap-1.5 mt-2">
                        {/* Show color swatches */}
                        {[...new Set(product.variants.map((v) => v.colorCode).filter(Boolean))]
                            .slice(0, 4)
                            .map((colorCode, index) => (
                                <span
                                    key={index}
                                    className="w-4 h-4 rounded-full border border-border"
                                    style={{ backgroundColor: colorCode }}
                                />
                            ))}
                        {[...new Set(product.variants.map((v) => v.colorCode).filter(Boolean))].length > 4 && (
                            <span className="text-xs text-muted">
                                +{[...new Set(product.variants.map((v) => v.colorCode).filter(Boolean))].length - 4}
                            </span>
                        )}
                    </div>
                )}

                {/* Price */}
                <div className="mt-3 flex items-center gap-2">
                    <span className={`font-semibold ${isOnSale ? "text-error" : "text-foreground"}`}>
                        {formatPrice(price)}
                    </span>
                    {isOnSale && (
                        <span className="text-sm text-muted line-through">
                            {formatPrice(compareAtPrice)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

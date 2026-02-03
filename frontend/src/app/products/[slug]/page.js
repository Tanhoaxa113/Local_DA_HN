"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { productsAPI } from "@/lib/api";
import { formatPrice, calculateDiscount, getImageUrl, classNames } from "@/lib/utils";
import ProductCard from "@/components/product/ProductCard";

// Icons
const MinusIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
);

const PlusIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const HeartIcon = ({ filled }) => (
    <svg
        className={`w-6 h-6 ${filled ? "fill-red-500 text-red-500" : "fill-none"}`}
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

const ShareIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
);

const TruckIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
);

const ShieldIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
);

const RefreshIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
);

const ChevronLeftIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);

/**
 * Product Detail Page
 * Trang Chi tiết sản phẩm
 * 
 * Chức năng:
 * - Hiển thị thông tin chi tiết (ảnh, tên, giá, mô tả...)
 * - Chọn phân loại (màu sắc, kích thước)
 * - Thêm vào giỏ hàng
 * - Xem sản phẩm liên quan
 */
export default function ProductDetailPage() {
    const params = useParams();
    const { addItem } = useCart();

    // Data states
    const [product, setProduct] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Selection states
    // Trạng thái lựa chọn phân loại
    const [selectedImage, setSelectedImage] = useState(0);
    const [selectedColor, setSelectedColor] = useState(null);
    const [selectedSize, setSelectedSize] = useState(null);
    const [quantity, setQuantity] = useState(1);

    // UI states
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [activeTab, setActiveTab] = useState("description");

    // Fetch product data from API
    // Lấy dữ liệu sản phẩm khi component mount
    useEffect(() => {
        const fetchProduct = async () => {
            setLoading(true);
            try {
                // Get product by slug
                // API lấy sản phẩm theo slug
                const response = await productsAPI.getBySlug(params.slug);
                if (response.success && response.data) {
                    setProduct(response.data);

                    // Fetch related products
                    // Lấy sản phẩm liên quan (cùng danh mục)
                    if (response.data.category?.id) {
                        const relatedRes = await productsAPI.getAll({
                            category: response.data.category.slug,
                            limit: 4,
                            excludeId: response.data.id,
                        });
                        if (relatedRes.success) {
                            // Backend returns { success, message, data: { data: [], pagination: {} } }
                            const result = relatedRes.data;
                            setRelatedProducts(result?.data || []);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch product:", error);
            } finally {
                setLoading(false);
            }
        };

        if (params.slug) {
            fetchProduct();
        }
    }, [params.slug]);

    // Get unique colors and sizes
    // Lấy danh sách màu sắc duy nhất từ variants
    const colors = product?.variants
        ? [...new Map(product.variants.map((v) => [v.color, { name: v.color, code: v.colorCode }])).values()]
        : [];

    // Lấy danh sách kích thước tương ứng với màu đã chọn
    const sizes = product?.variants
        ? [...new Set(product.variants.filter((v) => !selectedColor || v.color === selectedColor).map((v) => v.size))]
        : [];

    // Get selected variant
    // Xác định variant đang được chọn
    const selectedVariant = product?.variants?.find(
        (v) => v.color === selectedColor && v.size === selectedSize
    );

    // Auto-select first available color
    // Tự động chọn màu đầu tiên có hàng
    useEffect(() => {
        if (colors.length > 0 && !selectedColor) {
            const firstAvailableColor = colors.find((c) =>
                product.variants.some((v) => v.color === c.name && v.availableStock > 0)
            );
            setSelectedColor(firstAvailableColor?.name || colors[0].name);
        }
    }, [colors, product]);

    // Auto-select first available size when color changes
    // Tự động chọn size đầu tiên có hàng khi đổi màu
    useEffect(() => {
        if (selectedColor) {
            const availableSizes = product?.variants
                ?.filter((v) => v.color === selectedColor && v.availableStock > 0)
                .map((v) => v.size);
            if (availableSizes?.length > 0) {
                setSelectedSize(availableSizes[0]);
            } else {
                setSelectedSize(null);
            }
        }
    }, [selectedColor, product]);

    /**
     * Handle Add to Cart
     * Xử lý thêm vào giỏ hàng
     */
    const handleAddToCart = async () => {
        if (!selectedVariant) return;

        setIsAdding(true);
        // Call Context action
        await addItem(selectedVariant.id, quantity, {
            ...selectedVariant,
            product: { name: product.name, images: product.images },
        });
        setIsAdding(false);
    };

    const isOnSale = selectedVariant?.compareAtPrice &&
        parseFloat(selectedVariant.compareAtPrice) > parseFloat(selectedVariant.price);

    const discountPercent = isOnSale
        ? calculateDiscount(parseFloat(selectedVariant.compareAtPrice), parseFloat(selectedVariant.price))
        : 0;

    if (loading) {
        return <ProductDetailSkeleton />;
    }

    if (!product) {
        return (
            <div className="container py-16 text-center">
                <h1 className="text-2xl font-bold text-foreground mb-4">
                    Không tìm thấy sản phẩm
                </h1>
                <Link href="/products" className="text-accent hover:underline">
                    Quay lại danh sách sản phẩm
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Breadcrumb */}
            <div className="bg-secondary py-4">
                <div className="container">
                    <nav className="flex items-center gap-2 text-sm text-muted">
                        <Link href="/" className="hover:text-accent transition-colors">
                            Trang chủ
                        </Link>
                        <span>/</span>
                        <Link href="/products" className="hover:text-accent transition-colors">
                            Sản phẩm
                        </Link>
                        <span>/</span>
                        <Link
                            href={`/products?category=${product.category.slug}`}
                            className="hover:text-accent transition-colors"
                        >
                            {product.category.name}
                        </Link>
                        <span>/</span>
                        <span className="text-foreground">{product.name}</span>
                    </nav>
                </div>
            </div>

            {/* Product Detail */}
            <div className="container py-8 lg:py-12">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
                    {/* Image Gallery */}
                    <div className="space-y-4">
                        {/* Main Image */}
                        <div className="relative aspect-[3/4] bg-secondary rounded-2xl overflow-hidden">
                            <Image
                                src={getImageUrl(product.images[selectedImage]?.url)}
                                alt={product.images[selectedImage]?.altText || product.name}
                                fill
                                className="object-cover"
                                priority
                                unoptimized
                            />

                            {/* Sale Badge */}
                            {isOnSale && (
                                <div className="absolute top-4 left-4 badge badge-error text-base px-3 py-1">
                                    -{discountPercent}%
                                </div>
                            )}

                            {/* Navigation Arrows */}
                            {product.images.length > 1 && (
                                <>
                                    <button
                                        onClick={() =>
                                            setSelectedImage((prev) =>
                                                prev === 0 ? product.images.length - 1 : prev - 1
                                            )
                                        }
                                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                                    >
                                        <ChevronLeftIcon />
                                    </button>
                                    <button
                                        onClick={() =>
                                            setSelectedImage((prev) =>
                                                prev === product.images.length - 1 ? 0 : prev + 1
                                            )
                                        }
                                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                                    >
                                        <ChevronRightIcon />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Thumbnails */}
                        {product.images.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto no-scrollbar">
                                {product.images.map((image, index) => (
                                    <button
                                        key={image.id}
                                        onClick={() => setSelectedImage(index)}
                                        className={classNames(
                                            "relative w-20 h-24 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors",
                                            selectedImage === index
                                                ? "border-accent"
                                                : "border-transparent hover:border-border"
                                        )}
                                    >
                                        <Image
                                            src={getImageUrl(image.url)}
                                            alt={image.altText || `${product.name} - ${index + 1}`}
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Product Info */}
                    <div className="space-y-6">
                        {/* Brand */}
                        {product.brand && (
                            <Link
                                href={`/products?brand=${product.brand.slug}`}
                                className="text-sm text-muted uppercase tracking-wider hover:text-accent transition-colors"
                            >
                                {product.brand.name}
                            </Link>
                        )}

                        {/* Title */}
                        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                            {product.name}
                        </h1>

                        {/* Price */}
                        <div className="flex items-center gap-3">
                            <span className={classNames(
                                "text-2xl lg:text-3xl font-bold",
                                isOnSale ? "text-error" : "text-foreground"
                            )}>
                                {formatPrice(selectedVariant?.price || product.variants[0]?.price)}
                            </span>
                            {isOnSale && (
                                <span className="text-lg text-muted line-through">
                                    {formatPrice(selectedVariant?.compareAtPrice)}
                                </span>
                            )}
                        </div>

                        {/* SKU & Stock */}
                        {selectedVariant && (
                            <div className="flex items-center gap-4 text-sm">
                                <span className="text-muted">SKU: {selectedVariant.sku}</span>
                                <span className={classNames(
                                    "font-medium",
                                    selectedVariant.availableStock > 0 ? "text-success" : "text-error"
                                )}>
                                    {selectedVariant.availableStock > 0
                                        ? `Còn ${selectedVariant.availableStock} sản phẩm`
                                        : "Hết hàng"}
                                </span>
                            </div>
                        )}

                        {/* Color Selection */}
                        {colors.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-3">
                                    Màu sắc: <span className="font-normal text-muted">{selectedColor}</span>
                                </label>
                                <div className="flex flex-wrap gap-3">
                                    {colors.map((color) => {
                                        const hasStock = product.variants.some(
                                            (v) => v.color === color.name && v.availableStock > 0
                                        );
                                        return (
                                            <button
                                                key={color.name}
                                                onClick={() => setSelectedColor(color.name)}
                                                disabled={!hasStock}
                                                className={classNames(
                                                    "w-10 h-10 rounded-full border-2 transition-all relative",
                                                    selectedColor === color.name
                                                        ? "border-foreground ring-2 ring-offset-2 ring-foreground"
                                                        : "border-border hover:border-foreground",
                                                    !hasStock && "opacity-40 cursor-not-allowed"
                                                )}
                                                style={{ backgroundColor: color.code }}
                                                title={color.name}
                                            >
                                                {!hasStock && (
                                                    <span className="absolute inset-0 flex items-center justify-center">
                                                        <span className="w-[2px] h-full bg-error rotate-45 absolute" />
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Size Selection */}
                        {sizes.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-medium text-foreground">
                                        Kích thước: <span className="font-normal text-muted">{selectedSize}</span>
                                    </label>
                                    <button className="text-sm text-accent hover:underline">
                                        Hướng dẫn chọn size
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {sizes.map((size) => {
                                        const variant = product.variants.find(
                                            (v) => v.color === selectedColor && v.size === size
                                        );
                                        const hasStock = variant?.availableStock > 0;
                                        return (
                                            <button
                                                key={size}
                                                onClick={() => setSelectedSize(size)}
                                                disabled={!hasStock}
                                                className={classNames(
                                                    "min-w-[48px] px-4 py-2 border-2 rounded-lg font-medium text-sm transition-all",
                                                    selectedSize === size
                                                        ? "border-foreground bg-foreground text-background"
                                                        : hasStock
                                                            ? "border-border text-foreground hover:border-foreground"
                                                            : "border-border text-muted line-through cursor-not-allowed"
                                                )}
                                            >
                                                {size}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Quantity */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-3">
                                Số lượng
                            </label>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center border border-border rounded-lg">
                                    <button
                                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                        className="p-3 text-muted hover:text-foreground transition-colors"
                                    >
                                        <MinusIcon />
                                    </button>
                                    <input
                                        type="number"
                                        min="1"
                                        max={selectedVariant?.availableStock || 99}
                                        value={quantity}
                                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-16 text-center bg-transparent border-none focus:outline-none text-foreground font-medium"
                                    />
                                    <button
                                        onClick={() =>
                                            setQuantity((q) =>
                                                Math.min(selectedVariant?.availableStock || 99, q + 1)
                                            )
                                        }
                                        className="p-3 text-muted hover:text-foreground transition-colors"
                                    >
                                        <PlusIcon />
                                    </button>
                                </div>

                                {selectedVariant && selectedVariant.availableStock <= 5 && selectedVariant.availableStock > 0 && (
                                    <span className="text-sm text-warning">
                                        Chỉ còn {selectedVariant.availableStock} sản phẩm!
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4">
                            <button
                                onClick={handleAddToCart}
                                disabled={!selectedVariant || selectedVariant.availableStock === 0 || isAdding}
                                className={classNames(
                                    "btn btn-lg flex-1",
                                    selectedVariant && selectedVariant.availableStock > 0
                                        ? "btn-primary"
                                        : "bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted"
                                )}
                            >
                                {isAdding ? (
                                    <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : selectedVariant?.availableStock === 0 ? (
                                    "Hết hàng"
                                ) : (
                                    "Thêm vào giỏ hàng"
                                )}
                            </button>

                            <button
                                onClick={() => setIsWishlisted(!isWishlisted)}
                                className="w-14 h-14 flex items-center justify-center border border-border rounded-lg hover:bg-secondary transition-colors"
                            >
                                <HeartIcon filled={isWishlisted} />
                            </button>

                            <button className="w-14 h-14 flex items-center justify-center border border-border rounded-lg hover:bg-secondary transition-colors">
                                <ShareIcon />
                            </button>
                        </div>

                        {/* Features */}
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                            <div className="text-center">
                                <TruckIcon className="w-6 h-6 mx-auto text-accent mb-2" />
                                <p className="text-xs text-muted">Miễn phí vận chuyển</p>
                            </div>
                            <div className="text-center">
                                <ShieldIcon className="w-6 h-6 mx-auto text-accent mb-2" />
                                <p className="text-xs text-muted">Bảo hành 30 ngày</p>
                            </div>
                            <div className="text-center">
                                <RefreshIcon className="w-6 h-6 mx-auto text-accent mb-2" />
                                <p className="text-xs text-muted">Đổi trả dễ dàng</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mt-12 lg:mt-16">
                    <div className="border-b border-border">
                        <div className="flex gap-8">
                            {[
                                { id: "description", label: "Mô tả sản phẩm" },
                                { id: "reviews", label: "Đánh giá (0)" },
                                { id: "shipping", label: "Vận chuyển" },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={classNames(
                                        "pb-4 text-sm lg:text-base font-medium transition-colors relative",
                                        activeTab === tab.id
                                            ? "text-foreground"
                                            : "text-muted hover:text-foreground"
                                    )}
                                >
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="py-8">
                        {activeTab === "description" && (
                            <div
                                className="prose prose-neutral max-w-none"
                                dangerouslySetInnerHTML={{ __html: product.description }}
                            />
                        )}
                        {activeTab === "reviews" && (
                            <div className="text-center py-8">
                                <p className="text-muted">Chưa có đánh giá nào cho sản phẩm này.</p>
                            </div>
                        )}
                        {activeTab === "shipping" && (
                            <div className="space-y-4">
                                <h3 className="font-semibold text-foreground">Chính sách vận chuyển</h3>
                                <ul className="space-y-2 text-muted">
                                    <li>• Miễn phí vận chuyển toàn quốc</li>
                                    <li>• Thời gian giao hàng: 2-5 ngày làm việc (tùy khu vực)</li>
                                    <li>• Giao hàng nhanh trong 24h cho khu vực nội thành HCM và Hà Nội</li>
                                    <li>• Đóng gói cẩn thận, bảo quản sản phẩm trong quá trình vận chuyển</li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {/* Related Products */}
                <div className="mt-12 lg:mt-16">
                    <h2 className="text-2xl font-bold text-foreground mb-8">
                        Sản phẩm liên quan
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
                        {relatedProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProductDetailSkeleton() {
    return (
        <div className="container py-8 lg:py-12">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
                <div className="space-y-4">
                    <div className="aspect-[3/4] skeleton rounded-2xl" />
                    <div className="flex gap-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="w-20 h-24 skeleton rounded-lg" />
                        ))}
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="h-4 w-24 skeleton rounded" />
                    <div className="h-8 w-full skeleton rounded" />
                    <div className="h-8 w-32 skeleton rounded" />
                    <div className="space-y-3">
                        <div className="h-4 w-20 skeleton rounded" />
                        <div className="flex gap-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="w-10 h-10 skeleton rounded-full" />
                            ))}
                        </div>
                    </div>
                    <div className="h-14 skeleton rounded-lg" />
                </div>
            </div>
        </div>
    );
}

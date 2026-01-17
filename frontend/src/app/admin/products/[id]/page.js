"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { categoriesAPI, brandsAPI, API_BASE_URL } from "@/lib/api";
import { getImageUrl } from "@/lib/utils";

// Icons
const ArrowLeftIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
);

const PlusIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

const UploadIcon = () => (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);

const defaultVariant = {
    sku: "",
    size: "",
    color: "",
    colorCode: "#000000",
    price: "",
    compareAtPrice: "",
    costPrice: "",
    stock: 0,
    availableStock: 0,
    lowStockThreshold: 5,
    isActive: true,
    isNew: true,
};

export default function AdminEditProductPage() {
    const router = useRouter();
    const params = useParams();
    const productId = params.id;
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        description: "",
        categoryId: "",
        brandId: "",
        isActive: true,
        isFeatured: false,
    });
    const [variants, setVariants] = useState([]);
    const [existingImages, setExistingImages] = useState([]);
    const [newImages, setNewImages] = useState([]);
    const [newImageFiles, setNewImageFiles] = useState([]);
    const [deletedImageIds, setDeletedImageIds] = useState([]);
    const [deletedVariantIds, setDeletedVariantIds] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchFormData();
        fetchProduct();
    }, [productId]);

    const fetchFormData = async () => {
        try {
            const [catRes, brandRes] = await Promise.all([
                categoriesAPI.getAll(),
                brandsAPI.getAll(),
            ]);
            setCategories(catRes.data || []);
            setBrands(brandRes.data || []);
        } catch (err) {
            console.error("Failed to fetch form data:", err);
        }
    };

    const fetchProduct = async () => {
        try {
            const token = localStorage.getItem("accessToken");
            const response = await fetch(`${API_BASE_URL}/admin/products/${productId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Product not found");
            }

            const product = result.data;
            setFormData({
                name: product.name || "",
                slug: product.slug || "",
                description: product.description || "",
                categoryId: product.categoryId?.toString() || "",
                brandId: product.brandId?.toString() || "",
                isActive: product.isActive ?? true,
                isFeatured: product.isFeatured ?? false,
            });

            setVariants(
                (product.variants || []).map((v) => ({
                    id: v.id,
                    sku: v.sku || "",
                    size: v.size || "",
                    color: v.color || "",
                    colorCode: v.colorCode || "#000000",
                    price: v.price?.toString() || "",
                    compareAtPrice: v.compareAtPrice?.toString() || "",
                    costPrice: v.costPrice?.toString() || "",
                    stock: v.stock || 0,
                    availableStock: v.availableStock || 0,
                    lowStockThreshold: v.lowStockThreshold || 5,
                    isActive: v.isActive ?? true,
                    isNew: false,
                }))
            );

            setExistingImages(
                (product.images || []).map((img) => ({
                    id: img.id,
                    url: img.url,
                    isPrimary: img.isPrimary,
                }))
            );
        } catch (err) {
            console.error("Failed to fetch product:", err);
            setError(err.message || "Không thể tải thông tin sản phẩm");
        } finally {
            setLoading(false);
        }
    };

    const generateSlug = (name) => {
        return name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === "checkbox" ? checked : value;
        setFormData((prev) => ({ ...prev, [name]: newValue }));
    };

    const handleVariantChange = (index, field, value) => {
        setVariants((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const addVariant = () => {
        setVariants((prev) => [...prev, { ...defaultVariant }]);
    };

    const removeVariant = (index) => {
        const variant = variants[index];
        if (variant.id) {
            setDeletedVariantIds((prev) => [...prev, variant.id]);
        }
        setVariants((prev) => prev.filter((_, i) => i !== index));
    };

    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const allImages = [...existingImages, ...newImages];
        const newImgs = files.map((file) => ({
            file,
            preview: URL.createObjectURL(file),
            isPrimary: allImages.length === 0,
        }));

        setNewImages((prev) => [...prev, ...newImgs]);
        setNewImageFiles((prev) => [...prev, ...files]);
    };

    const removeExistingImage = (index) => {
        const image = existingImages[index];
        setDeletedImageIds((prev) => [...prev, image.id]);
        setExistingImages((prev) => {
            const updated = prev.filter((_, i) => i !== index);
            if (image.isPrimary && updated.length > 0) {
                updated[0].isPrimary = true;
            }
            return updated;
        });
    };

    const removeNewImage = (index) => {
        setNewImages((prev) => prev.filter((_, i) => i !== index));
        setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const setPrimaryImage = (type, index) => {
        setExistingImages((prev) =>
            prev.map((img, i) => ({
                ...img,
                isPrimary: type === "existing" && i === index,
            }))
        );
        setNewImages((prev) =>
            prev.map((img, i) => ({
                ...img,
                isPrimary: type === "new" && i === index,
            }))
        );
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            setError("Vui lòng nhập tên sản phẩm");
            return false;
        }
        if (!formData.categoryId) {
            setError("Vui lòng chọn danh mục");
            return false;
        }
        if (variants.length === 0) {
            setError("Sản phẩm cần ít nhất một biến thể");
            return false;
        }
        if (variants.some((v) => !v.sku || !v.size || !v.color || !v.price)) {
            setError("Vui lòng điền đầy đủ thông tin SKU, size, màu và giá cho tất cả biến thể");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!validateForm()) return;

        setSaving(true);
        try {
            const submitData = new FormData();

            submitData.append("data", JSON.stringify({
                ...formData,
                categoryId: parseInt(formData.categoryId, 10),
                brandId: formData.brandId ? parseInt(formData.brandId, 10) : null,
                variants: variants.map((v) => ({
                    id: v.isNew ? undefined : v.id,
                    sku: v.sku,
                    size: v.size,
                    color: v.color,
                    colorCode: v.colorCode,
                    price: parseFloat(v.price),
                    compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice) : null,
                    costPrice: v.costPrice ? parseFloat(v.costPrice) : null,
                    stock: parseInt(v.stock, 10) || 0,
                    availableStock: parseInt(v.availableStock, 10) || 0,
                    lowStockThreshold: parseInt(v.lowStockThreshold, 10) || 5,
                    isActive: v.isActive,
                })),
                deletedVariantIds,
                deletedImageIds,
                existingImages: existingImages.map((img) => ({
                    id: img.id,
                    isPrimary: img.isPrimary,
                })),
            }));

            newImageFiles.forEach((file) => {
                submitData.append("images", file);
            });

            const token = localStorage.getItem("accessToken");
            const response = await fetch(`${API_BASE_URL}/admin/products/${productId}`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` },
                body: submitData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Failed to update product");
            }

            router.push("/admin/products");
        } catch (err) {
            console.error("Failed to update product:", err);
            setError(err.message || "Không thể cập nhật sản phẩm. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Bạn có chắc muốn xóa sản phẩm này? Hành động này không thể hoàn tác.")) {
            return;
        }

        try {
            const token = localStorage.getItem("accessToken");
            const response = await fetch(`${API_BASE_URL}/admin/products/${productId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || "Failed to delete product");
            }

            router.push("/admin/products");
        } catch (err) {
            console.error("Failed to delete product:", err);
            setError(err.message || "Không thể xóa sản phẩm");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 text-muted hover:text-foreground transition-colors"
                    >
                        <ArrowLeftIcon />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Chỉnh sửa sản phẩm</h1>
                        <p className="text-muted mt-1">{formData.name}</p>
                    </div>
                </div>
                <button
                    onClick={handleDelete}
                    className="px-4 py-2 border border-error text-error font-medium rounded-lg hover:bg-error/10 transition-colors"
                >
                    Xóa sản phẩm
                </button>
            </div>

            {error && (
                <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="bg-card rounded-xl border border-border p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4">Thông tin cơ bản</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Tên sản phẩm *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Slug (URL)
                            </label>
                            <input
                                type="text"
                                name="slug"
                                value={formData.slug}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Danh mục *
                            </label>
                            <select
                                name="categoryId"
                                value={formData.categoryId}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
                                required
                            >
                                <option value="">Chọn danh mục</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Thương hiệu
                            </label>
                            <select
                                name="brandId"
                                value={formData.brandId}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
                            >
                                <option value="">Không có</option>
                                {brands.map((brand) => (
                                    <option key={brand.id} value={brand.id}>
                                        {brand.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Mô tả
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={4}
                                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent resize-none"
                            />
                        </div>
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="isActive"
                                    checked={formData.isActive}
                                    onChange={handleInputChange}
                                    className="w-4 h-4 accent-accent"
                                />
                                <span className="text-sm text-foreground">Hiển thị sản phẩm</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="isFeatured"
                                    checked={formData.isFeatured}
                                    onChange={handleInputChange}
                                    className="w-4 h-4 accent-accent"
                                />
                                <span className="text-sm text-foreground">Sản phẩm nổi bật</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Images */}
                <div className="bg-card rounded-xl border border-border p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4">Hình ảnh sản phẩm</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {/* Existing Images */}
                        {existingImages.map((img, index) => (
                            <div
                                key={`existing-${img.id}`}
                                className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 ${img.isPrimary ? "border-accent" : "border-border"
                                    }`}
                            >
                                <Image
                                    src={getImageUrl(img.url)}
                                    alt={`Product ${index + 1}`}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    {!img.isPrimary && (
                                        <button
                                            type="button"
                                            onClick={() => setPrimaryImage("existing", index)}
                                            className="p-2 bg-white rounded-full text-primary text-xs"
                                        >
                                            ★
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeExistingImage(index)}
                                        className="p-2 bg-error rounded-full text-white"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                                {img.isPrimary && (
                                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-accent text-white text-xs rounded">
                                        Chính
                                    </span>
                                )}
                            </div>
                        ))}

                        {/* New Images */}
                        {newImages.map((img, index) => (
                            <div
                                key={`new-${index}`}
                                className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 ${img.isPrimary ? "border-accent" : "border-border"
                                    }`}
                            >
                                <Image
                                    src={img.preview}
                                    alt={`New ${index + 1}`}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    {!img.isPrimary && existingImages.length === 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setPrimaryImage("new", index)}
                                            className="p-2 bg-white rounded-full text-primary text-xs"
                                        >
                                            ★
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeNewImage(index)}
                                        className="p-2 bg-error rounded-full text-white"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                                <span className="absolute top-2 right-2 px-2 py-0.5 bg-success text-white text-xs rounded">
                                    Mới
                                </span>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-[3/4] rounded-lg border-2 border-dashed border-border hover:border-accent flex flex-col items-center justify-center gap-2 text-muted hover:text-accent transition-colors"
                        >
                            <UploadIcon />
                            <span className="text-sm">Thêm ảnh</span>
                        </button>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageSelect}
                        className="hidden"
                    />
                </div>

                {/* Variants */}
                <div className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-foreground">Biến thể sản phẩm</h2>
                        <button
                            type="button"
                            onClick={addVariant}
                            className="btn btn-accent btn-sm gap-2"
                        >
                            <PlusIcon />
                            Thêm biến thể
                        </button>
                    </div>

                    <div className="space-y-4">
                        {variants.map((variant, index) => (
                            <div
                                key={variant.id || `new-${index}`}
                                className={`p-4 rounded-lg border ${variant.isNew ? "bg-success/5 border-success/20" : "bg-secondary/30 border-border"
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-foreground">
                                            {variant.isNew ? "Biến thể mới" : `#${variant.id}`}
                                        </span>
                                        {variant.isNew && (
                                            <span className="px-2 py-0.5 bg-success text-white text-xs rounded">
                                                Mới
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeVariant(index)}
                                        className="p-1 text-muted hover:text-error transition-colors"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                    <div>
                                        <label className="block text-xs text-muted mb-1">SKU *</label>
                                        <input
                                            type="text"
                                            value={variant.sku}
                                            onChange={(e) => handleVariantChange(index, "sku", e.target.value)}
                                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-muted mb-1">Size *</label>
                                        <input
                                            type="text"
                                            value={variant.size}
                                            onChange={(e) => handleVariantChange(index, "size", e.target.value)}
                                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-muted mb-1">Màu sắc *</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={variant.color}
                                                onChange={(e) => handleVariantChange(index, "color", e.target.value)}
                                                className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
                                                required
                                            />
                                            <input
                                                type="color"
                                                value={variant.colorCode}
                                                onChange={(e) => handleVariantChange(index, "colorCode", e.target.value)}
                                                className="w-10 h-10 rounded border border-border cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-muted mb-1">Giá bán *</label>
                                        <input
                                            type="number"
                                            value={variant.price}
                                            onChange={(e) => handleVariantChange(index, "price", e.target.value)}
                                            min="0"
                                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-muted mb-1">Giá gốc</label>
                                        <input
                                            type="number"
                                            value={variant.compareAtPrice}
                                            onChange={(e) => handleVariantChange(index, "compareAtPrice", e.target.value)}
                                            min="0"
                                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-muted mb-1">Tồn kho</label>
                                        <input
                                            type="number"
                                            value={variant.stock}
                                            onChange={(e) => handleVariantChange(index, "stock", e.target.value)}
                                            min="0"
                                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {variants.length === 0 && (
                            <div className="text-center py-8 text-muted">
                                Chưa có biến thể nào. Nhấn "Thêm biến thể" để bắt đầu.
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="btn btn-outline"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn btn-accent flex items-center gap-2"
                    >
                        {saving && (
                            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        )}
                        Lưu thay đổi
                    </button>
                </div>
            </form>
        </div>
    );
}

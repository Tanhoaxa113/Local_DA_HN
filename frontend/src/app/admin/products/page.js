"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { productsAPI, categoriesAPI, brandsAPI } from "@/lib/api";
import { formatPrice, getImageUrl } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { hasPageAccess, ROLES } from "@/lib/permissions";

// Icons
const PlusIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const SearchIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);

const EditIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
    </svg>
);

const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

/**
 * Admin Products Management Page
 * Trang Quản lý sản phẩm (Admin)
 * 
 * Chức năng:
 * - Hiển thị danh sách sản phẩm
 * - Lọc theo danh mục, thương hiệu, trạng thái
 * - Tìm kiếm sản phẩm
 * - Thêm mới, chỉnh sửa, xóa sản phẩm
 */
export default function AdminProductsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const userRole = user?.role?.name || user?.role;

    // Data states
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter & Search states
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState({
        category: "",
        brand: "",
        status: "",
    });

    // Pagination state
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    });

    // Redirect non-ADMIN users
    useEffect(() => {
        if (!authLoading && !hasPageAccess(userRole, "products")) {
            router.push("/admin");
        }
    }, [authLoading, userRole, router]);

    useEffect(() => {
        if (hasPageAccess(userRole, "products")) {
            fetchProducts();
            fetchFilters();
        }
    }, [filters, pagination.page, search, userRole]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                search,
                ...filters,
            };
            const response = await productsAPI.getAll(params);
            if (response.success) {
                // Handle different response structures: { data: [...] } or { data: { data: [...], pagination: {...} } }
                const productsData = Array.isArray(response.data)
                    ? response.data
                    : response.data?.data || response.data?.items || [];

                setProducts(productsData);

                setPagination((prev) => ({
                    ...prev,
                    total: response.data?.pagination?.total || response.data?.total || 0,
                    totalPages: response.data?.pagination?.totalPages || response.data?.totalPages || 1,
                }));
            }
        } catch (err) {
            console.error("Failed to fetch products:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchFilters = async () => {
        try {
            const [catRes, brandRes] = await Promise.all([
                categoriesAPI.getAll(),
                brandsAPI.getAll(),
            ]);
            setCategories(catRes.data || []);
            setBrands(brandRes.data || []);
        } catch (err) {
            console.error("Failed to fetch filters:", err);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;
        try {
            await productsAPI.delete(id);
            fetchProducts();
        } catch (err) {
            console.error("Failed to delete product:", err);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Sản phẩm</h1>
                    <p className="text-muted mt-1">Quản lý danh sách sản phẩm</p>
                </div>
                <Link
                    href="/admin/products/new"
                    className="btn btn-primary gap-2"
                >
                    <PlusIcon />
                    Thêm sản phẩm
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm sản phẩm..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:border-accent"
                        />
                    </div>

                    {/* Category Filter */}
                    <select
                        value={filters.category}
                        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                        className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
                    >
                        <option value="">Tất cả danh mục</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.slug}>
                                {cat.name}
                            </option>
                        ))}
                    </select>

                    {/* Brand Filter */}
                    <select
                        value={filters.brand}
                        onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                        className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
                    >
                        <option value="">Tất cả thương hiệu</option>
                        {brands.map((brand) => (
                            <option key={brand.id} value={brand.slug}>
                                {brand.name}
                            </option>
                        ))}
                    </select>

                    {/* Status Filter */}
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="active">Đang bán</option>
                        <option value="outOfStock">Hết hàng</option>
                        <option value="lowStock">Sắp hết</option>
                    </select>
                </div>
            </div>

            {/* Products Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-muted mb-4">Không tìm thấy sản phẩm nào</p>
                        <Link
                            href="/admin/products/new"
                            className="btn btn-primary gap-2"
                        >
                            <PlusIcon />
                            Thêm sản phẩm
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-secondary/50">
                                    <th className="text-left p-4 text-sm font-medium text-muted">
                                        Sản phẩm
                                    </th>
                                    <th className="text-left p-4 text-sm font-medium text-muted">
                                        Danh mục
                                    </th>
                                    <th className="text-left p-4 text-sm font-medium text-muted">
                                        Giá
                                    </th>
                                    <th className="text-left p-4 text-sm font-medium text-muted">
                                        Tồn kho
                                    </th>
                                    <th className="text-left p-4 text-sm font-medium text-muted">
                                        Trạng thái
                                    </th>
                                    <th className="text-right p-4 text-sm font-medium text-muted">
                                        Thao tác
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product) => {
                                    const primaryImage = product.images?.find((i) => i.isPrimary) || product.images?.[0];
                                    const totalStock = product.variants?.reduce((sum, v) => sum + (v.availableStock || 0), 0) || 0;
                                    const minPrice = Math.min(...(product.variants?.map((v) => v.price) || [0]));

                                    return (
                                        <tr key={product.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-14 bg-secondary rounded-lg overflow-hidden relative flex-shrink-0">
                                                        <Image
                                                            src={getImageUrl(primaryImage?.url)}
                                                            alt={product.name}
                                                            fill
                                                            className="object-cover"
                                                            sizes="48px"
                                                            unoptimized
                                                        />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-foreground truncate">
                                                            {product.name}
                                                        </p>
                                                        <p className="text-sm text-muted">{product.brand?.name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-foreground">
                                                {product.category?.name || "—"}
                                            </td>
                                            <td className="p-4 font-medium text-foreground">
                                                {formatPrice(minPrice)}
                                            </td>
                                            <td className="p-4">
                                                <span
                                                    className={`font-medium ${totalStock === 0
                                                        ? "text-error"
                                                        : totalStock <= 10
                                                            ? "text-warning"
                                                            : "text-foreground"
                                                        }`}
                                                >
                                                    {totalStock}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {totalStock === 0 ? (
                                                    <span className="badge badge-error">Hết hàng</span>
                                                ) : totalStock <= 10 ? (
                                                    <span className="badge badge-warning">Sắp hết</span>
                                                ) : (
                                                    <span className="badge badge-success">Còn hàng</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/admin/products/${product.id}`}
                                                        className="p-2 text-muted hover:text-accent transition-colors"
                                                        title="Chỉnh sửa"
                                                    >
                                                        <EditIcon />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(product.id)}
                                                        className="p-2 text-muted hover:text-error transition-colors"
                                                        title="Xóa"
                                                    >
                                                        <TrashIcon />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-border">
                        <p className="text-sm text-muted">
                            Hiển thị {products.length} / {pagination.total} sản phẩm
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                                disabled={pagination.page === 1}
                                className="btn btn-outline btn-sm"
                            >
                                Trước
                            </button>
                            <span className="text-sm text-foreground">
                                {pagination.page} / {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                                disabled={pagination.page === pagination.totalPages}
                                className="btn btn-outline btn-sm"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

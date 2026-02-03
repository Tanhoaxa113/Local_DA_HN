"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/components/product/ProductCard";
import { productsAPI, categoriesAPI, brandsAPI } from "@/lib/api";
import { formatPrice, debounce } from "@/lib/utils";

// Filter Icons
const FilterIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
    </svg>
);

const GridIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
);

const ListIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);

const CloseIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const ChevronDownIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);

const sortOptions = [
    { value: "newest", label: "Mới nhất" },
    { value: "price-asc", label: "Giá: Thấp đến cao" },
    { value: "price-desc", label: "Giá: Cao đến thấp" },
    { value: "name-asc", label: "Tên: A-Z" },
    { value: "name-desc", label: "Tên: Z-A" },
    { value: "bestselling", label: "Bán chạy nhất" },
];

const priceRanges = [
    { min: 0, max: 200000, label: "Dưới 200K" },
    { min: 200000, max: 500000, label: "200K - 500K" },
    { min: 500000, max: 1000000, label: "500K - 1 Triệu" },
    { min: 1000000, max: 2000000, label: "1 - 2 Triệu" },
    { min: 2000000, max: null, label: "Trên 2 Triệu" },
];

/**
 * Products Listing Page
 * Trang Danh sách sản phẩm
 * 
 * Chức năng: 
 * - Hiển thị danh sách sản phẩm dạng lưới hoặc list
 * - Lọc sản phẩm theo (Danh mục, Thương hiệu, Giá, ...)
 * - Tìm kiếm và sắp xếp
 * - Phân trang
 */
export default function ProductsPage() {
    const searchParams = useSearchParams();

    // Data states
    // Trạng thái dữ liệu
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI states
    // Trạng thái giao diện
    const [viewMode, setViewMode] = useState("grid");
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Filter states
    // Bộ lọc hiện tại
    const [filters, setFilters] = useState({
        category: searchParams.get("category") || "",
        brand: searchParams.get("brand") || "",
        priceMin: searchParams.get("priceMin") || "",
        priceMax: searchParams.get("priceMax") || "",
        sort: searchParams.get("sort") || "newest",
        search: searchParams.get("search") || "",
        onSale: searchParams.get("onSale") === "true",
        inStock: searchParams.get("inStock") === "true",
    });

    // Pagination state
    // Trạng thái phân trang
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 0,
    });

    // Fetch data
    useEffect(() => {
        fetchProducts();
    }, [filters, pagination.page]);

    useEffect(() => {
        fetchFiltersData();
    }, []);

    // Sync filters with URL params
    useEffect(() => {
        setFilters(prev => ({
            ...prev,
            category: searchParams.get("category") || "",
            brand: searchParams.get("brand") || "",
            priceMin: searchParams.get("priceMin") || "",
            priceMax: searchParams.get("priceMax") || "",
            sort: searchParams.get("sort") || "newest",
            search: searchParams.get("search") || "",
            onSale: searchParams.get("onSale") === "true",
            inStock: searchParams.get("inStock") === "true",
        }));
    }, [searchParams]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            // Call API with filters
            const params = {
                page: pagination.page,
                limit: pagination.limit,
            };

            // Add filters to params
            if (filters.category) params.categorySlug = filters.category;
            if (filters.brand) params.brandSlug = filters.brand;
            if (filters.priceMin) params.minPrice = filters.priceMin;
            if (filters.priceMax) params.maxPrice = filters.priceMax;
            if (filters.search) params.search = filters.search;
            if (filters.onSale) params.onSale = true;
            if (filters.inStock) params.inStock = true;

            // Handle sort
            if (filters.sort) {
                const sortMap = {
                    "newest": { sortBy: "createdAt", sortOrder: "desc" },
                    "price-asc": { sortBy: "price", sortOrder: "asc" },
                    "price-desc": { sortBy: "price", sortOrder: "desc" },
                    "name-asc": { sortBy: "name", sortOrder: "asc" },
                    "name-desc": { sortBy: "name", sortOrder: "desc" },
                    "bestselling": { sortBy: "totalSold", sortOrder: "desc" },
                };
                const sortConfig = sortMap[filters.sort];
                if (sortConfig) {
                    params.sortBy = sortConfig.sortBy;
                    params.sortOrder = sortConfig.sortOrder;
                }
            }

            const response = await productsAPI.getAll(params);

            if (response.success) {
                // Backend returns { success, message, data: { data: [], pagination: {} } }
                const result = response.data;
                setProducts(result?.data || []);
                setPagination(prev => ({
                    ...prev,
                    total: result?.pagination?.total || 0,
                    totalPages: result?.pagination?.totalPages || 1,
                }));
            } else {
                setProducts([]);
            }
        } catch (error) {
            console.error("Failed to fetch products:", error);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchFiltersData = async () => {
        try {
            const [categoriesRes, brandsRes] = await Promise.all([
                categoriesAPI.getAll(),
                brandsAPI.getAll(),
            ]);
            setCategories(categoriesRes.data || []);
            setBrands(brandsRes.data || []);
        } catch (error) {
            console.error("Failed to fetch filters data:", error);
        }
    };

    const updateFilter = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const clearFilters = () => {
        setFilters({
            category: "",
            brand: "",
            priceMin: "",
            priceMax: "",
            sort: "newest",
            search: "",
            onSale: false,
            inStock: false,
        });
    };

    const activeFiltersCount = [
        filters.category,
        filters.brand,
        filters.priceMin,
        filters.priceMax,
        filters.onSale,
        filters.inStock,
    ].filter(Boolean).length;

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-secondary py-8 lg:py-12">
                <div className="container">
                    <h1 className="text-2xl lg:text-4xl font-bold text-foreground text-center">
                        Tất cả sản phẩm
                    </h1>
                    {filters.search && (
                        <p className="text-muted text-center mt-2">
                            Kết quả tìm kiếm cho "{filters.search}"
                        </p>
                    )}
                </div>
            </div>

            <div className="container py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Desktop Sidebar */}
                    <aside className="hidden lg:block w-64 flex-shrink-0">
                        <FilterSidebar
                            categories={categories}
                            brands={brands}
                            filters={filters}
                            updateFilter={updateFilter}
                            clearFilters={clearFilters}
                        />
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1">
                        {/* Toolbar */}
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                            <div className="flex items-center gap-4">
                                {/* Mobile Filter Button */}
                                <button
                                    onClick={() => setIsFilterOpen(true)}
                                    className="btn btn-outline lg:hidden flex items-center gap-2"
                                >
                                    <FilterIcon />
                                    Lọc
                                    {activeFiltersCount > 0 && (
                                        <span className="w-5 h-5 bg-accent text-white text-xs rounded-full flex items-center justify-center">
                                            {activeFiltersCount}
                                        </span>
                                    )}
                                </button>

                                <p className="text-sm text-muted">
                                    {pagination.total} sản phẩm
                                </p>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Sort Dropdown */}
                                <div className="relative">
                                    <select
                                        value={filters.sort}
                                        onChange={(e) => updateFilter("sort", e.target.value)}
                                        className="appearance-none bg-transparent pl-4 pr-10 py-2 border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-accent cursor-pointer"
                                    >
                                        {sortOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDownIcon />
                                </div>

                                {/* View Mode Toggle */}
                                <div className="hidden sm:flex items-center border border-border rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => setViewMode("grid")}
                                        className={`p-2 ${viewMode === "grid" ? "bg-primary text-background" : "text-muted hover:text-foreground"}`}
                                    >
                                        <GridIcon />
                                    </button>
                                    <button
                                        onClick={() => setViewMode("list")}
                                        className={`p-2 ${viewMode === "list" ? "bg-primary text-background" : "text-muted hover:text-foreground"}`}
                                    >
                                        <ListIcon />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Active Filters */}
                        {activeFiltersCount > 0 && (
                            <div className="flex flex-wrap items-center gap-2 mb-6">
                                <span className="text-sm text-muted">Đang lọc:</span>
                                {filters.category && (
                                    <FilterTag
                                        label={categories.find(c => c.slug === filters.category)?.name || filters.category}
                                        onRemove={() => updateFilter("category", "")}
                                    />
                                )}
                                {filters.brand && (
                                    <FilterTag
                                        label={brands.find(b => b.slug === filters.brand)?.name || filters.brand}
                                        onRemove={() => updateFilter("brand", "")}
                                    />
                                )}
                                {(filters.priceMin || filters.priceMax) && (
                                    <FilterTag
                                        label={`${formatPrice(filters.priceMin || 0)} - ${filters.priceMax ? formatPrice(filters.priceMax) : "∞"}`}
                                        onRemove={() => {
                                            updateFilter("priceMin", "");
                                            updateFilter("priceMax", "");
                                        }}
                                    />
                                )}
                                {filters.onSale && (
                                    <FilterTag label="Đang giảm giá" onRemove={() => updateFilter("onSale", false)} />
                                )}
                                {filters.inStock && (
                                    <FilterTag label="Còn hàng" onRemove={() => updateFilter("inStock", false)} />
                                )}
                                <button
                                    onClick={clearFilters}
                                    className="text-sm text-accent hover:text-accent-hover transition-colors"
                                >
                                    Xóa tất cả
                                </button>
                            </div>
                        )}

                        {/* Products Grid */}
                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 lg:gap-6">
                                {[...Array(6)].map((_, i) => (
                                    <ProductSkeleton key={i} />
                                ))}
                            </div>
                        ) : products.length === 0 ? (
                            <div className="text-center py-16">
                                <p className="text-xl font-medium text-foreground mb-2">
                                    Không tìm thấy sản phẩm
                                </p>
                                <p className="text-muted mb-4">
                                    Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
                                </p>
                                <button
                                    onClick={clearFilters}
                                    className="btn btn-primary"
                                >
                                    Xóa bộ lọc
                                </button>
                            </div>
                        ) : (
                            <div className={`grid gap-4 lg:gap-6 ${viewMode === "grid"
                                ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-3"
                                : "grid-cols-1"
                                }`}>
                                {products.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="flex justify-center mt-12">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                        disabled={pagination.page === 1}
                                        className="btn btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Trước
                                    </button>

                                    {[...Array(pagination.totalPages)].map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setPagination(prev => ({ ...prev, page: i + 1 }))}
                                            className={`w-10 h-10 rounded-lg font-medium transition-colors ${pagination.page === i + 1
                                                ? "bg-primary text-background"
                                                : "border border-border text-foreground hover:bg-secondary"
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}

                                    <button
                                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                        disabled={pagination.page === pagination.totalPages}
                                        className="btn btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Sau
                                    </button>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {/* Mobile Filter Drawer */}
            {isFilterOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-50 lg:hidden"
                        onClick={() => setIsFilterOpen(false)}
                    />
                    <div className="fixed inset-y-0 left-0 w-full max-w-sm bg-card z-50 animate-slide-in-right lg:hidden overflow-y-auto">
                        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-border bg-card">
                            <h2 className="text-lg font-semibold">Bộ lọc</h2>
                            <button
                                onClick={() => setIsFilterOpen(false)}
                                className="p-2 text-muted hover:text-foreground"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <FilterSidebar
                            categories={categories}
                            brands={brands}
                            filters={filters}
                            updateFilter={updateFilter}
                            clearFilters={clearFilters}
                            onClose={() => setIsFilterOpen(false)}
                        />
                    </div>
                </>
            )}
        </div>
    );
}

function FilterSidebar({ categories, brands, filters, updateFilter, clearFilters, onClose }) {
    return (
        <div className="space-y-6 p-4 lg:p-0">
            {/* Categories */}
            <div>
                <h3 className="font-semibold text-foreground mb-4">Danh mục</h3>
                <div className="space-y-2">
                    {categories.map((category) => (
                        <label
                            key={category.id}
                            className="flex items-center gap-3 cursor-pointer group"
                        >
                            <input
                                type="radio"
                                name="category"
                                checked={filters.category === category.slug}
                                onChange={() => updateFilter("category", category.slug)}
                                className="w-4 h-4 text-accent focus:ring-accent border-border"
                            />
                            <span className="text-foreground group-hover:text-accent transition-colors">
                                {category.name}
                            </span>
                            <span className="text-muted text-sm ml-auto">({category.productCount})</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Brands */}
            <div>
                <h3 className="font-semibold text-foreground mb-4">Thương hiệu</h3>
                <div className="space-y-2">
                    {brands.map((brand) => (
                        <label
                            key={brand.id}
                            className="flex items-center gap-3 cursor-pointer group"
                        >
                            <input
                                type="checkbox"
                                checked={filters.brand === brand.slug}
                                onChange={() => updateFilter("brand", filters.brand === brand.slug ? "" : brand.slug)}
                                className="w-4 h-4 text-accent focus:ring-accent border-border rounded"
                            />
                            <span className="text-foreground group-hover:text-accent transition-colors">
                                {brand.name}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Price Range */}
            <div>
                <h3 className="font-semibold text-foreground mb-4">Khoảng giá</h3>
                <div className="space-y-2">
                    {priceRanges.map((range, index) => (
                        <label
                            key={index}
                            className="flex items-center gap-3 cursor-pointer group"
                        >
                            <input
                                type="radio"
                                name="priceRange"
                                checked={
                                    filters.priceMin === String(range.min) &&
                                    (range.max === null ? !filters.priceMax : filters.priceMax === String(range.max))
                                }
                                onChange={() => {
                                    updateFilter("priceMin", String(range.min));
                                    updateFilter("priceMax", range.max ? String(range.max) : "");
                                }}
                                className="w-4 h-4 text-accent focus:ring-accent border-border"
                            />
                            <span className="text-foreground group-hover:text-accent transition-colors">
                                {range.label}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Other Filters */}
            <div>
                <h3 className="font-semibold text-foreground mb-4">Khác</h3>
                <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={filters.onSale}
                            onChange={() => updateFilter("onSale", !filters.onSale)}
                            className="w-4 h-4 text-accent focus:ring-accent border-border rounded"
                        />
                        <span className="text-foreground group-hover:text-accent transition-colors">
                            Đang giảm giá
                        </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={filters.inStock}
                            onChange={() => updateFilter("inStock", !filters.inStock)}
                            className="w-4 h-4 text-accent focus:ring-accent border-border rounded"
                        />
                        <span className="text-foreground group-hover:text-accent transition-colors">
                            Còn hàng
                        </span>
                    </label>
                </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-border space-y-2">
                <button
                    onClick={clearFilters}
                    className="btn btn-outline w-full"
                >
                    Xóa bộ lọc
                </button>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="btn btn-primary w-full"
                    >
                        Xem kết quả
                    </button>
                )}
            </div>
        </div>
    );
}

function FilterTag({ label, onRemove }) {
    return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-secondary text-foreground text-sm rounded-full">
            {label}
            <button onClick={onRemove} className="hover:text-error transition-colors">
                <CloseIcon />
            </button>
        </span>
    );
}

function ProductSkeleton() {
    return (
        <div className="bg-card rounded-xl overflow-hidden border border-border">
            <div className="aspect-product skeleton" />
            <div className="p-4 space-y-3">
                <div className="h-3 w-16 skeleton rounded" />
                <div className="h-4 w-full skeleton rounded" />
                <div className="h-4 w-3/4 skeleton rounded" />
                <div className="h-5 w-24 skeleton rounded" />
            </div>
        </div>
    );
}

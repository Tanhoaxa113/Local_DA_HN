"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { brandsAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { hasPageAccess } from "@/lib/permissions";

// Icons
const PlusIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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

const CloseIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export default function AdminBrandsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const userRole = user?.role?.name || user?.role;

    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState(null);
    const [formData, setFormData] = useState({ name: "", slug: "", description: "" });
    const [formLoading, setFormLoading] = useState(false);

    // Redirect non-ADMIN users
    useEffect(() => {
        if (!authLoading && !hasPageAccess(userRole, "brands")) {
            router.push("/admin");
        }
    }, [authLoading, userRole, router]);

    useEffect(() => {
        if (hasPageAccess(userRole, "brands")) {
            fetchBrands();
        }
    }, [userRole]);

    const fetchBrands = async () => {
        try {
            const response = await brandsAPI.getAll();
            if (response.success) {
                setBrands(response.data || []);
            }
        } catch (err) {
            console.error("Failed to fetch brands:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (brand = null) => {
        if (brand) {
            setEditingBrand(brand);
            setFormData({
                name: brand.name || "",
                slug: brand.slug || "",
                description: brand.description || "",
            });
        } else {
            setEditingBrand(null);
            setFormData({ name: "", slug: "", description: "" });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingBrand(null);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) return;

        setFormLoading(true);
        try {
            const data = {
                ...formData,
                slug: formData.slug || generateSlug(formData.name),
            };

            if (editingBrand) {
                await brandsAPI.update(editingBrand.id, data);
            } else {
                await brandsAPI.create(data);
            }
            await fetchBrands();
            handleCloseModal();
        } catch (err) {
            console.error("Failed to save brand:", err);
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Bạn có chắc muốn xóa thương hiệu này?")) return;
        try {
            await brandsAPI.delete(id);
            fetchBrands();
        } catch (err) {
            console.error("Failed to delete brand:", err);
            alert("Không thể xóa thương hiệu. Có thể đang có sản phẩm thuộc thương hiệu này.");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Thương hiệu</h1>
                    <p className="text-muted mt-1">Quản lý thương hiệu sản phẩm</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="btn btn-accent gap-2"
                >
                    <PlusIcon />
                    Thêm thương hiệu
                </button>
            </div>

            {/* Brands Grid */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : brands.length === 0 ? (
                    <div className="text-center py-16 text-muted">
                        Chưa có thương hiệu nào
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {brands.map((brand) => (
                            <div
                                key={brand.id}
                                className="p-4 bg-secondary/30 rounded-lg border border-border hover:border-accent transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-semibold text-foreground">{brand.name}</h3>
                                        <p className="text-sm text-muted mt-1">{brand.slug}</p>
                                        {brand.description && (
                                            <p className="text-sm text-muted mt-2 line-clamp-2">{brand.description}</p>
                                        )}
                                        <p className="text-sm text-accent mt-2">
                                            {brand._count?.products || 0} sản phẩm
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleOpenModal(brand)}
                                            className="p-2 text-muted hover:text-accent transition-colors"
                                        >
                                            <EditIcon />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(brand.id)}
                                            className="p-2 text-muted hover:text-error transition-colors"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-50" onClick={handleCloseModal} />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-xl z-50 overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h3 className="text-lg font-semibold text-foreground">
                                {editingBrand ? "Chỉnh sửa thương hiệu" : "Thêm thương hiệu"}
                            </h3>
                            <button onClick={handleCloseModal} className="p-2 text-muted hover:text-foreground">
                                <CloseIcon />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Tên thương hiệu *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Slug (tùy chọn)</label>
                                <input
                                    type="text"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    placeholder={generateSlug(formData.name) || "tu-dong-tao"}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:border-accent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Mô tả</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent resize-none"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="btn btn-outline flex-1"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="btn btn-accent flex-1 gap-2"
                                >
                                    {formLoading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                                    {editingBrand ? "Lưu" : "Thêm"}
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
}

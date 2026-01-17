"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { categoriesAPI } from "@/lib/api";
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

export default function AdminCategoriesPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const userRole = user?.role?.name || user?.role;

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({ name: "", slug: "", description: "" });
    const [formLoading, setFormLoading] = useState(false);

    // Redirect non-ADMIN users
    useEffect(() => {
        if (!authLoading && !hasPageAccess(userRole, "categories")) {
            router.push("/admin");
        }
    }, [authLoading, userRole, router]);

    useEffect(() => {
        if (hasPageAccess(userRole, "categories")) {
            fetchCategories();
        }
    }, [userRole]);

    const fetchCategories = async () => {
        try {
            const response = await categoriesAPI.getAll();
            if (response.success) {
                setCategories(response.data || []);
            }
        } catch (err) {
            console.error("Failed to fetch categories:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (category = null) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name || "",
                slug: category.slug || "",
                description: category.description || "",
            });
        } else {
            setEditingCategory(null);
            setFormData({ name: "", slug: "", description: "" });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
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

            if (editingCategory) {
                await categoriesAPI.update(editingCategory.id, data);
            } else {
                await categoriesAPI.create(data);
            }
            await fetchCategories();
            handleCloseModal();
        } catch (err) {
            console.error("Failed to save category:", err);
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Bạn có chắc muốn xóa danh mục này?")) return;
        try {
            await categoriesAPI.delete(id);
            fetchCategories();
        } catch (err) {
            console.error("Failed to delete category:", err);
            alert("Không thể xóa danh mục. Có thể đang có sản phẩm thuộc danh mục này.");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Danh mục</h1>
                    <p className="text-muted mt-1">Quản lý danh mục sản phẩm</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="btn btn-accent gap-2"
                >
                    <PlusIcon />
                    Thêm danh mục
                </button>
            </div>

            {/* Categories Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : categories.length === 0 ? (
                    <div className="text-center py-16 text-muted">
                        Chưa có danh mục nào
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border bg-secondary/50">
                                <th className="text-left p-4 text-sm font-medium text-muted">Tên danh mục</th>
                                <th className="text-left p-4 text-sm font-medium text-muted">Slug</th>
                                <th className="text-left p-4 text-sm font-medium text-muted">Số sản phẩm</th>
                                <th className="text-right p-4 text-sm font-medium text-muted">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map((category) => (
                                <tr key={category.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                                    <td className="p-4 font-medium text-foreground">{category.name}</td>
                                    <td className="p-4 text-muted">{category.slug}</td>
                                    <td className="p-4 text-foreground">{category._count?.products || 0}</td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleOpenModal(category)}
                                                className="p-2 text-muted hover:text-accent transition-colors"
                                            >
                                                <EditIcon />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(category.id)}
                                                className="p-2 text-muted hover:text-error transition-colors"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-50" onClick={handleCloseModal} />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-xl z-50 overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h3 className="text-lg font-semibold text-foreground">
                                {editingCategory ? "Chỉnh sửa danh mục" : "Thêm danh mục"}
                            </h3>
                            <button onClick={handleCloseModal} className="p-2 text-muted hover:text-foreground">
                                <CloseIcon />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Tên danh mục *</label>
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
                                    {editingCategory ? "Lưu" : "Thêm"}
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
}

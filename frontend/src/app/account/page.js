"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { isValidEmail, isValidPhone } from "@/lib/utils";

export default function AccountPage() {
    const { user, updateProfile } = useAuth();

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        fullName: user?.fullName || "",
        email: user?.email || "",
        phone: user?.phone || "",
    });

    const [formErrors, setFormErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.fullName.trim()) {
            errors.fullName = "Vui lòng nhập họ tên";
        }

        if (!formData.email.trim()) {
            errors.email = "Vui lòng nhập email";
        } else if (!isValidEmail(formData.email)) {
            errors.email = "Email không hợp lệ";
        }

        if (formData.phone && !isValidPhone(formData.phone)) {
            errors.phone = "Số điện thoại không hợp lệ";
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const result = await updateProfile(formData);

            if (result.success) {
                setSuccess("Cập nhật thông tin thành công!");
                setIsEditing(false);
            } else {
                setError(result.error || "Cập nhật thất bại. Vui lòng thử lại.");
            }
        } catch (err) {
            setError("Đã có lỗi xảy ra. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            fullName: user?.fullName || "",
            email: user?.email || "",
            phone: user?.phone || "",
        });
        setFormErrors({});
        setIsEditing(false);
    };

    return (
        <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-foreground">
                        Thông tin cá nhân
                    </h2>
                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="text-accent hover:text-accent-hover font-medium text-sm transition-colors"
                        >
                            Chỉnh sửa
                        </button>
                    )}
                </div>

                {/* Success Message */}
                {success && (
                    <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg text-success text-sm">
                        {success}
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
                        {error}
                    </div>
                )}

                {isEditing ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Họ và tên
                            </label>
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 bg-background border rounded-lg text-foreground focus:outline-none transition-colors ${formErrors.fullName ? "border-error" : "border-border focus:border-accent"
                                    }`}
                            />
                            {formErrors.fullName && (
                                <p className="mt-1 text-sm text-error">{formErrors.fullName}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 bg-background border rounded-lg text-foreground focus:outline-none transition-colors ${formErrors.email ? "border-error" : "border-border focus:border-accent"
                                    }`}
                            />
                            {formErrors.email && (
                                <p className="mt-1 text-sm text-error">{formErrors.email}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Số điện thoại
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="0901234567"
                                className={`w-full px-4 py-3 bg-background border rounded-lg text-foreground placeholder-muted focus:outline-none transition-colors ${formErrors.phone ? "border-error" : "border-border focus:border-accent"
                                    }`}
                            />
                            {formErrors.phone && (
                                <p className="mt-1 text-sm text-error">{formErrors.phone}</p>
                            )}
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading && (
                                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                )}
                                Lưu thay đổi
                            </button>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="btn btn-outline"
                            >
                                Hủy
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center py-3 border-b border-border">
                            <span className="w-32 text-muted text-sm">Họ và tên</span>
                            <span className="text-foreground font-medium">{user?.fullName || "-"}</span>
                        </div>
                        <div className="flex items-center py-3 border-b border-border">
                            <span className="w-32 text-muted text-sm">Email</span>
                            <span className="text-foreground">{user?.email || "-"}</span>
                        </div>
                        <div className="flex items-center py-3 border-b border-border">
                            <span className="w-32 text-muted text-sm">Số điện thoại</span>
                            <span className="text-foreground">{user?.phone || "-"}</span>
                        </div>
                        <div className="flex items-center py-3">
                            <span className="w-32 text-muted text-sm">Hạng thành viên</span>
                            <span className="badge badge-accent">{user?.memberTier?.name || "Thường"}</span>
                        </div>
                    </div>
                )}
            </div>


            {/* Account Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card rounded-xl border border-border p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">0</p>
                    <p className="text-sm text-muted">Đơn hàng</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">0</p>
                    <p className="text-sm text-muted">Yêu thích</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">0</p>
                    <p className="text-sm text-muted">Địa chỉ</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-4 text-center">
                    <p className="text-2xl font-bold text-accent">{user?.loyaltyPoints || 0}</p>
                    <p className="text-sm text-muted">Điểm thưởng</p>
                </div>
            </div>
        </div>
    );
}

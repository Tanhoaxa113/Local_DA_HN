"use client";

import { useState } from "react";
import { authAPI } from "@/lib/api";

// Icons
const EyeIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const EyeSlashIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
);

export default function PasswordPage() {
    const [formData, setFormData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });

    const [formErrors, setFormErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const toggleShowPassword = (field) => {
        setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.currentPassword) {
            errors.currentPassword = "Vui lòng nhập mật khẩu hiện tại";
        }

        if (!formData.newPassword) {
            errors.newPassword = "Vui lòng nhập mật khẩu mới";
        } else if (formData.newPassword.length < 6) {
            errors.newPassword = "Mật khẩu phải có ít nhất 6 ký tự";
        } else if (formData.newPassword === formData.currentPassword) {
            errors.newPassword = "Mật khẩu mới phải khác mật khẩu hiện tại";
        }

        if (!formData.confirmPassword) {
            errors.confirmPassword = "Vui lòng xác nhận mật khẩu mới";
        } else if (formData.confirmPassword !== formData.newPassword) {
            errors.confirmPassword = "Mật khẩu xác nhận không khớp";
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
            const response = await authAPI.changePassword({
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword,
            });

            if (response.success) {
                setSuccess("Đổi mật khẩu thành công!");
                setFormData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                });
            } else {
                throw new Error(response.message || "Đổi mật khẩu thất bại");
            }
        } catch (err) {
            setError(err.message || "Mật khẩu hiện tại không đúng");
        } finally {
            setLoading(false);
        }
    };

    // Password strength indicator
    const getPasswordStrength = (password) => {
        if (!password) return { strength: 0, label: "", color: "" };

        let strength = 0;
        if (password.length >= 6) strength++;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        const levels = [
            { strength: 0, label: "", color: "" },
            { strength: 1, label: "Yếu", color: "bg-error" },
            { strength: 2, label: "Trung bình", color: "bg-warning" },
            { strength: 3, label: "Khá", color: "bg-info" },
            { strength: 4, label: "Mạnh", color: "bg-success" },
            { strength: 5, label: "Rất mạnh", color: "bg-success" },
        ];

        return levels[strength];
    };

    const passwordStrength = getPasswordStrength(formData.newPassword);

    return (
        <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">
                    Đổi mật khẩu
                </h2>

                {success && (
                    <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg text-success text-sm">
                        {success}
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
                    {/* Current Password */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Mật khẩu hiện tại
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.current ? "text" : "password"}
                                name="currentPassword"
                                value={formData.currentPassword}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 pr-12 bg-background border rounded-lg text-foreground focus:outline-none transition-colors ${formErrors.currentPassword ? "border-error" : "border-border focus:border-accent"
                                    }`}
                            />
                            <button
                                type="button"
                                onClick={() => toggleShowPassword("current")}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                            >
                                {showPasswords.current ? <EyeSlashIcon /> : <EyeIcon />}
                            </button>
                        </div>
                        {formErrors.currentPassword && (
                            <p className="mt-1 text-sm text-error">{formErrors.currentPassword}</p>
                        )}
                    </div>

                    {/* New Password */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Mật khẩu mới
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.new ? "text" : "password"}
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleChange}
                                placeholder="Ít nhất 6 ký tự"
                                className={`w-full px-4 py-3 pr-12 bg-background border rounded-lg text-foreground placeholder-muted focus:outline-none transition-colors ${formErrors.newPassword ? "border-error" : "border-border focus:border-accent"
                                    }`}
                            />
                            <button
                                type="button"
                                onClick={() => toggleShowPassword("new")}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                            >
                                {showPasswords.new ? <EyeSlashIcon /> : <EyeIcon />}
                            </button>
                        </div>
                        {formErrors.newPassword && (
                            <p className="mt-1 text-sm text-error">{formErrors.newPassword}</p>
                        )}

                        {/* Password Strength */}
                        {formData.newPassword && (
                            <div className="mt-2">
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((level) => (
                                        <div
                                            key={level}
                                            className={`h-1 flex-1 rounded-full transition-colors ${level <= passwordStrength.strength
                                                ? passwordStrength.color
                                                : "bg-border"
                                                }`}
                                        />
                                    ))}
                                </div>
                                <p className="text-xs text-muted mt-1">
                                    Độ mạnh: {passwordStrength.label}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Xác nhận mật khẩu mới
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.confirm ? "text" : "password"}
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 pr-12 bg-background border rounded-lg text-foreground focus:outline-none transition-colors ${formErrors.confirmPassword ? "border-error" : "border-border focus:border-accent"
                                    }`}
                            />
                            <button
                                type="button"
                                onClick={() => toggleShowPassword("confirm")}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                            >
                                {showPasswords.confirm ? <EyeSlashIcon /> : <EyeIcon />}
                            </button>
                        </div>
                        {formErrors.confirmPassword && (
                            <p className="mt-1 text-sm text-error">{formErrors.confirmPassword}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading && (
                            <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        )}
                        Đổi mật khẩu
                    </button>
                </form>
            </div>

            {/* Security Tips */}
            <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">
                    Mẹo bảo mật
                </h3>
                <ul className="space-y-2 text-sm text-muted">
                    <li>• Sử dụng ít nhất 8 ký tự cho mật khẩu</li>
                    <li>• Kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt</li>
                    <li>• Không sử dụng thông tin cá nhân dễ đoán</li>
                    <li>• Không dùng chung mật khẩu cho nhiều tài khoản</li>
                    <li>• Thay đổi mật khẩu định kỳ (3-6 tháng)</li>
                </ul>
            </div>
        </div>
    );
}

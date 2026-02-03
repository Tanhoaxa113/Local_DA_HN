"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isValidEmail, isValidPhone } from "@/lib/utils";

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

const CheckIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

/**
 * Register Page Component
 * Trang Đăng ký
 * 
 * Chức năng: Cho phép người dùng tạo tài khoản mới
 * Luồng xử lý:
 * 1. Nhập thông tin (Họ tên, email, phone, password)
 * 2. Validate dữ liệu
 * 3. Gọi API register qua AuthContext
 * 4. Xử lý kết quả:
 *    - Thành công: Chuyển hướng về trang chủ
 *    - Thất bại: Hiển thị lỗi
 */
export default function RegisterPage() {
    const router = useRouter();
    const { register } = useAuth();

    // Form state
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        agreeTerms: false,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    /**
     * Handle input change
     * Xử lý thay đổi giá trị input
     */
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));

        // Clear error when user types
        // Xóa lỗi khi người dùng gõ lại
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    /**
     * Validate form data
     * Kiểm tra dữ liệu đầu vào
     * @returns {boolean} Kết quả kiểm tra
     */
    const validateForm = () => {
        const newErrors = {};

        // Validate Fullname
        if (!formData.fullName.trim()) {
            newErrors.fullName = "Vui lòng nhập họ tên";
        } else if (formData.fullName.length < 2) {
            newErrors.fullName = "Họ tên phải có ít nhất 2 ký tự";
        }

        // Validate Email
        if (!formData.email.trim()) {
            newErrors.email = "Vui lòng nhập email";
        } else if (!isValidEmail(formData.email)) {
            newErrors.email = "Email không hợp lệ";
        }

        // Validate Phone
        if (formData.phone && !isValidPhone(formData.phone)) {
            newErrors.phone = "Số điện thoại không hợp lệ";
        }

        // Validate Password
        if (!formData.password) {
            newErrors.password = "Vui lòng nhập mật khẩu";
        } else if (formData.password.length < 6) {
            newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
        }

        // Validate Confirm Password
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
        }

        // Validate Terms
        if (!formData.agreeTerms) {
            newErrors.agreeTerms = "Bạn phải đồng ý với điều khoản sử dụng";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /**
     * Handle form submission
     * Xử lý đăng ký tài khoản
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Check validation
        // Kiểm tra hợp lệ
        if (!validateForm()) return;

        setLoading(true);

        try {
            // Call register API
            // Gọi API đăng ký
            const result = await register({
                fullName: formData.fullName,
                email: formData.email,
                phone: formData.phone || undefined,
                password: formData.password,
            });

            if (result.success) {
                // Redirect on success
                // Chuyển hướng thành công
                router.push("/");
            } else {
                setErrors({ general: result.error || "Đăng ký thất bại. Vui lòng thử lại." });
            }
        } catch (err) {
            setErrors({ general: "Đã có lỗi xảy ra. Vui lòng thử lại." });
        } finally {
            setLoading(false);
        }
    };

    /**
     * Helper to calculate password strength
     * Hàm tính độ mạnh của mật khẩu
     * @param {string} password 
     * @returns {object} { strength: 0-5, label: string, color: string }
     */
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

    const passwordStrength = getPasswordStrength(formData.password);

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-secondary py-12 px-4">
            <div className="w-full max-w-md">
                <div className="bg-card rounded-2xl shadow-lg p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-block text-2xl font-bold mb-2">
                            <span className="text-accent">CLOTHING</span>
                            <span className="text-foreground">SHOP</span>
                        </Link>
                        <h1 className="text-2xl font-bold text-foreground mt-4">
                            Tạo tài khoản
                        </h1>
                        <p className="text-muted mt-2">
                            Đăng ký để nhận nhiều ưu đãi hấp dẫn
                        </p>
                    </div>

                    {/* Error Message */}
                    {errors.general && (
                        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
                            {errors.general}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Full Name */}
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-foreground mb-2">
                                Họ và tên <span className="text-error">*</span>
                            </label>
                            <input
                                type="text"
                                id="fullName"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                placeholder="Nguyễn Văn A"
                                className={`w-full px-4 py-3 bg-background border rounded-lg text-foreground placeholder-muted focus:outline-none transition-colors ${errors.fullName ? "border-error" : "border-border focus:border-accent"
                                    }`}
                            />
                            {errors.fullName && (
                                <p className="mt-1 text-sm text-error">{errors.fullName}</p>
                            )}
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                                Email <span className="text-error">*</span>
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="your@email.com"
                                className={`w-full px-4 py-3 bg-background border rounded-lg text-foreground placeholder-muted focus:outline-none transition-colors ${errors.email ? "border-error" : "border-border focus:border-accent"
                                    }`}
                            />
                            {errors.email && (
                                <p className="mt-1 text-sm text-error">{errors.email}</p>
                            )}
                        </div>

                        {/* Phone */}
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                                Số điện thoại
                            </label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="0901234567"
                                className={`w-full px-4 py-3 bg-background border rounded-lg text-foreground placeholder-muted focus:outline-none transition-colors ${errors.phone ? "border-error" : "border-border focus:border-accent"
                                    }`}
                            />
                            {errors.phone && (
                                <p className="mt-1 text-sm text-error">{errors.phone}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                                Mật khẩu <span className="text-error">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Ít nhất 6 ký tự"
                                    className={`w-full px-4 py-3 pr-12 bg-background border rounded-lg text-foreground placeholder-muted focus:outline-none transition-colors ${errors.password ? "border-error" : "border-border focus:border-accent"
                                        }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="mt-1 text-sm text-error">{errors.password}</p>
                            )}

                            {/* Password Strength */}
                            {formData.password && (
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
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                                Xác nhận mật khẩu <span className="text-error">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Nhập lại mật khẩu"
                                    className={`w-full px-4 py-3 pr-12 bg-background border rounded-lg text-foreground placeholder-muted focus:outline-none transition-colors ${errors.confirmPassword ? "border-error" : "border-border focus:border-accent"
                                        }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                                >
                                    {showConfirmPassword ? <EyeSlashIcon /> : <EyeIcon />}
                                </button>
                                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                                    <span className="absolute right-12 top-1/2 -translate-y-1/2 text-success">
                                        <CheckIcon />
                                    </span>
                                )}
                            </div>
                            {errors.confirmPassword && (
                                <p className="mt-1 text-sm text-error">{errors.confirmPassword}</p>
                            )}
                        </div>

                        {/* Terms */}
                        <div>
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="agreeTerms"
                                    checked={formData.agreeTerms}
                                    onChange={handleChange}
                                    className="w-4 h-4 mt-0.5 text-accent focus:ring-accent border-border rounded"
                                />
                                <span className="text-sm text-muted">
                                    Tôi đồng ý với{" "}
                                    <Link href="/terms" className="text-accent hover:underline">
                                        điều khoản sử dụng
                                    </Link>{" "}
                                    và{" "}
                                    <Link href="/privacy" className="text-accent hover:underline">
                                        chính sách bảo mật
                                    </Link>
                                </span>
                            </label>
                            {errors.agreeTerms && (
                                <p className="mt-1 text-sm text-error">{errors.agreeTerms}</p>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    Đang đăng ký...
                                </>
                            ) : (
                                "Đăng ký"
                            )}
                        </button>
                    </form>

                    {/* Login Link */}
                    <p className="text-center mt-8 text-muted">
                        Đã có tài khoản?{" "}
                        <Link href="/login" className="text-accent font-medium hover:underline">
                            Đăng nhập
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

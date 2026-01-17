"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { hasPageAccess, isReadOnlyAccess, ROLES } from "@/lib/permissions";

export default function AdminSettingsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const userRole = user?.role?.name || user?.role;
    const isReadOnly = isReadOnlyAccess(userRole, "settings");

    const [shopInfo, setShopInfo] = useState({
        name: "Hữu Nghị Fashion",
        email: "contact@huunghi.vn",
        phone: "1900 1234",
        address: "123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
    });

    const [shipping, setShipping] = useState({
        freeShippingThreshold: 0,
        standardShippingFee: 0,
        expressShippingFee: 50000,
    });

    const [saving, setSaving] = useState(false);

    // Redirect users without access
    useEffect(() => {
        if (!authLoading && !hasPageAccess(userRole, "settings")) {
            router.push("/admin");
        }
    }, [authLoading, userRole, router]);

    const handleSaveShopInfo = async (e) => {
        e.preventDefault();
        if (isReadOnly) return;
        setSaving(true);
        // In production, call API
        setTimeout(() => {
            setSaving(false);
            alert("Đã lưu thông tin cửa hàng");
        }, 1000);
    };

    const handleSaveShipping = async (e) => {
        e.preventDefault();
        if (isReadOnly) return;
        setSaving(true);
        // In production, call API
        setTimeout(() => {
            setSaving(false);
            alert("Đã lưu cài đặt vận chuyển");
        }, 1000);
    };

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Cài đặt</h1>
                <p className="text-muted mt-1">Quản lý thông tin và cấu hình hệ thống</p>
            </div>

            {/* Read-only notice */}
            {isReadOnly && (
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg text-warning">
                    ⚠️ Bạn chỉ có quyền xem cài đặt, không thể chỉnh sửa.
                </div>
            )}

            {/* Shop Information */}
            <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Thông tin cửa hàng</h2>
                <form onSubmit={handleSaveShopInfo} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Tên cửa hàng</label>
                            <input
                                type="text"
                                value={shopInfo.name}
                                onChange={(e) => setShopInfo({ ...shopInfo, name: e.target.value })}
                                disabled={isReadOnly}
                                className={`w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent ${isReadOnly ? "opacity-60 cursor-not-allowed" : ""}`}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Email liên hệ</label>
                            <input
                                type="email"
                                value={shopInfo.email}
                                onChange={(e) => setShopInfo({ ...shopInfo, email: e.target.value })}
                                disabled={isReadOnly}
                                className={`w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent ${isReadOnly ? "opacity-60 cursor-not-allowed" : ""}`}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Số điện thoại</label>
                            <input
                                type="tel"
                                value={shopInfo.phone}
                                onChange={(e) => setShopInfo({ ...shopInfo, phone: e.target.value })}
                                disabled={isReadOnly}
                                className={`w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent ${isReadOnly ? "opacity-60 cursor-not-allowed" : ""}`}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Địa chỉ</label>
                            <input
                                type="text"
                                value={shopInfo.address}
                                onChange={(e) => setShopInfo({ ...shopInfo, address: e.target.value })}
                                disabled={isReadOnly}
                                className={`w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent ${isReadOnly ? "opacity-60 cursor-not-allowed" : ""}`}
                            />
                        </div>
                    </div>
                    {!isReadOnly && (
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn btn-primary gap-2"
                        >
                            {saving && <span className="loading loading-spinner loading-xs" />}
                            Lưu thay đổi
                        </button>
                    )}
                </form>
            </div>

            {/* Shipping Settings */}
            <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Cài đặt vận chuyển</h2>
                <form onSubmit={handleSaveShipping} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Miễn phí vận chuyển từ (₫)
                        </label>
                        <input
                            type="number"
                            value={shipping.freeShippingThreshold}
                            onChange={(e) => setShipping({ ...shipping, freeShippingThreshold: parseInt(e.target.value) })}
                            disabled={isReadOnly}
                            className={`w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent ${isReadOnly ? "opacity-60 cursor-not-allowed" : ""}`}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Phí ship tiêu chuẩn (₫)
                            </label>
                            <input
                                type="number"
                                value={shipping.standardShippingFee}
                                onChange={(e) => setShipping({ ...shipping, standardShippingFee: parseInt(e.target.value) })}
                                disabled={isReadOnly}
                                className={`w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent ${isReadOnly ? "opacity-60 cursor-not-allowed" : ""}`}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Phí ship nhanh (₫)
                            </label>
                            <input
                                type="number"
                                value={shipping.expressShippingFee}
                                onChange={(e) => setShipping({ ...shipping, expressShippingFee: parseInt(e.target.value) })}
                                disabled={isReadOnly}
                                className={`w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent ${isReadOnly ? "opacity-60 cursor-not-allowed" : ""}`}
                            />
                        </div>
                    </div>
                    {!isReadOnly && (
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn btn-accent flex items-center gap-2"
                        >
                            {saving && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                            Lưu thay đổi
                        </button>
                    )}
                </form>
            </div>

            {/* VNPAY Settings */}
            <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Cài đặt thanh toán VNPAY</h2>
                <p className="text-sm text-muted mb-4">
                    Cấu hình này được quản lý qua biến môi trường trong file .env của backend.
                </p>
                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-success rounded-full"></span>
                        <span className="text-foreground">VNPAY đã được cấu hình</span>
                    </div>
                    <p className="text-muted pl-5">Environment: Sandbox</p>
                </div>
            </div>

            {/* Loyalty Settings */}
            <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Cài đặt điểm thưởng</h2>
                <div className="space-y-4">
                    <div className="p-4 bg-secondary/50 rounded-lg">
                        <p className="font-medium text-foreground">Quy đổi điểm</p>
                        <p className="text-sm text-muted mt-1">1 điểm = 1.000₫ giá trị sử dụng</p>
                    </div>
                    <div className="p-4 bg-secondary/50 rounded-lg">
                        <p className="font-medium text-foreground">Tích điểm</p>
                        <p className="text-sm text-muted mt-1">10.000₫ chi tiêu = 1 điểm thưởng</p>
                    </div>
                    <div className="p-4 bg-secondary/50 rounded-lg">
                        <p className="font-medium text-foreground">Hạng thành viên</p>
                        <ul className="text-sm text-muted mt-1 space-y-1">
                            <li>• Thường: 0 điểm - Giảm 0%</li>
                            <li>• Bạc: 1.000 điểm - Giảm 3%</li>
                            <li>• Vàng: 5.000 điểm - Giảm 5%</li>
                            <li>• Kim Cương: 15.000 điểm - Giảm 10%</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { addressAPI, locationAPI } from "@/lib/api";

// Icons
const PlusIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const MapPinIcon = () => (
    <svg className="w-16 h-16 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
);

const EditIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
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

/**
 * User Addresses Page
 * Trang Quản lý sổ địa chỉ
 * 
 * Chức năng:
 * - Hiển thị danh sách địa chỉ giao hàng
 * - Thêm mới, chỉnh sửa, xóa địa chỉ
 * - Đặt địa chỉ mặc định
 * - Tự động load danh sách Tỉnh/Thành/Phường xã khi thêm/sửa
 */
export default function AddressesPage() {
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);

    // Location data for dropdowns
    // Dữ liệu Tỉnh/Thành, Phường/Xã cho dropdown
    const [provinces, setProvinces] = useState([]);
    const [wards, setWards] = useState([]);

    // Form data state
    const [formData, setFormData] = useState({
        label: "",
        fullName: "",
        phone: "",
        provinceId: "",
        provinceName: "",
        wardId: "",
        wardName: "",
        streetAddress: "",
        isDefault: false,
    });

    const [formErrors, setFormErrors] = useState({});
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        fetchAddresses();
        fetchProvinces();
    }, []);

    useEffect(() => {
        if (formData.provinceId) {
            // Check if we already have wards for this province related logic or just fetch fresh
            fetchWards(formData.provinceId);
            // Reset ward if province changes by user interaction (though useEffect runs on mount too w/ initial value)
            // We need to be careful not to reset ward if we are editing and setting initial data.
        } else {
            setWards([]);
        }
    }, [formData.provinceId]);

    const fetchAddresses = async () => {
        try {
            const response = await addressAPI.getAll();
            if (response.success) {
                setAddresses(response.data || []);
            }
        } catch (err) {
            console.error("Failed to fetch addresses:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProvinces = async () => {
        try {
            const data = await locationAPI.getProvinces();
            // Data is array of provinces directly
            setProvinces(data || []);
        } catch (err) {
            console.error("Failed to fetch provinces:", err);
        }
    };

    const fetchWards = async (provinceId) => {
        try {
            const data = await locationAPI.getProvinceDetails(provinceId);
            // API returns { ...province, wards: [] }
            // Note: Per plan these are technically districts but we use them as wards label
            setWards(data.wards || []);
        } catch (err) {
            console.error("Failed to fetch wards:", err);
        }
    };

    const handleOpenModal = (address = null) => {
        if (address) {
            setEditingAddress(address);
            setFormData({
                label: address.label || "",
                fullName: address.fullName || "",
                phone: address.phone || "",
                provinceId: address.provinceId || "",
                provinceName: address.provinceName || "",
                wardId: address.wardId || "",
                wardName: address.wardName || "",
                streetAddress: address.streetAddress || "",
                isDefault: address.isDefault || false,
            });
            // Fetch wards for the selected province immediately so the dropdown populates
            if (address.provinceId) {
                fetchWards(address.provinceId);
            }
        } else {
            setEditingAddress(null);
            setFormData({
                label: "",
                fullName: "",
                phone: "",
                provinceId: "",
                provinceName: "",
                wardId: "",
                wardName: "",
                streetAddress: "",
                isDefault: false,
            });
            setWards([]);
        }
        setFormErrors({});
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingAddress(null);
        setFormErrors({});
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (name === "provinceId") {
            const selectedProvince = provinces.find(p => p.code == value);
            setFormData(prev => ({
                ...prev,
                provinceId: value,
                provinceName: selectedProvince ? selectedProvince.name : "",
                wardId: "", // Reset ward
                wardName: ""
            }));
            return;
        }

        if (name === "wardId") {
            const selectedWard = wards.find(w => w.code == value);
            setFormData(prev => ({
                ...prev,
                wardId: value,
                wardName: selectedWard ? selectedWard.name : ""
            }));
            return;
        }

        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));

        if (formErrors[name]) {
            setFormErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate
        const errors = {};
        if (!formData.fullName) errors.fullName = "Vui lòng nhập họ tên";
        if (!formData.phone) errors.phone = "Vui lòng nhập số điện thoại";
        if (!formData.provinceId) errors.provinceId = "Vui lòng chọn tỉnh/thành";
        if (!formData.wardId) errors.wardId = "Vui lòng chọn phường/xã";
        if (!formData.streetAddress) errors.streetAddress = "Vui lòng nhập địa chỉ";

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setFormLoading(true);
        try {
            // Prepare payload
            const payload = {
                ...formData,
                provinceId: parseInt(formData.provinceId),
                wardId: parseInt(formData.wardId),
            };

            if (editingAddress) {
                await addressAPI.update(editingAddress.id, payload);
            } else {
                await addressAPI.create(payload);
            }
            await fetchAddresses();
            handleCloseModal();
        } catch (err) {
            console.error("Failed to save address:", err);
            setFormErrors({ form: err.message || "Có lỗi xảy ra, vui lòng thử lại" });
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Bạn có chắc muốn xóa địa chỉ này?")) return;

        try {
            await addressAPI.delete(id);
            setAddresses((prev) => prev.filter((a) => a.id !== id));
        } catch (err) {
            console.error("Failed to delete address:", err);
        }
    };

    const handleSetDefault = async (id) => {
        try {
            await addressAPI.setDefault(id);
            setAddresses((prev) =>
                prev.map((a) => ({
                    ...a,
                    isDefault: a.id === id,
                }))
            );
        } catch (err) {
            console.error("Failed to set default:", err);
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
            <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-foreground">
                        Địa chỉ của tôi
                    </h2>
                    <button
                        onClick={() => handleOpenModal()}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <PlusIcon />
                        <span className="hidden sm:inline">Thêm địa chỉ</span>
                    </button>
                </div>

                {addresses.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="flex justify-center mb-4">
                            <MapPinIcon />
                        </div>
                        <p className="text-lg font-medium text-foreground mb-2">
                            Chưa có địa chỉ nào
                        </p>
                        <p className="text-muted mb-6">
                            Thêm địa chỉ để thuận tiện cho việc giao hàng
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {addresses.map((address) => (
                            <div
                                key={address.id}
                                className={`p-4 border rounded-lg ${address.isDefault ? "border-accent bg-accent/5" : "border-border"
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            {address.label && (
                                                <span className="badge badge-accent">{address.label}</span>
                                            )}
                                            {address.isDefault && (
                                                <span className="text-xs text-success font-medium">Mặc định</span>
                                            )}
                                        </div>
                                        <p className="font-medium text-foreground">{address.fullName}</p>
                                        <p className="text-muted text-sm mt-1">{address.phone}</p>
                                        <p className="text-muted text-sm mt-1">
                                            {address.streetAddress}, {address.wardName}, {address.provinceName}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleOpenModal(address)}
                                            className="p-2 text-muted hover:text-accent transition-colors"
                                            title="Chỉnh sửa"
                                        >
                                            <EditIcon />
                                        </button>
                                        {!address.isDefault && (
                                            <button
                                                onClick={() => handleDelete(address.id)}
                                                className="p-2 text-muted hover:text-error transition-colors"
                                                title="Xóa"
                                            >
                                                <TrashIcon />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {!address.isDefault && (
                                    <button
                                        onClick={() => handleSetDefault(address.id)}
                                        className="mt-3 text-sm text-accent hover:text-accent-hover font-medium transition-colors"
                                    >
                                        Đặt làm mặc định
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-50"
                        onClick={handleCloseModal}
                    />
                    <div className="fixed inset-4 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-lg bg-card rounded-xl z-50 overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h3 className="text-lg font-semibold text-foreground">
                                {editingAddress ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ mới"}
                            </h3>
                            <button onClick={handleCloseModal} className="p-2 text-muted hover:text-foreground">
                                <CloseIcon />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
                            {formErrors.form && (
                                <div className="p-3 bg-error/10 text-error rounded-lg text-sm">
                                    {formErrors.form}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Nhãn (tùy chọn)
                                    </label>
                                    <input
                                        type="text"
                                        name="label"
                                        value={formData.label}
                                        onChange={handleChange}
                                        placeholder="Nhà riêng, Công ty..."
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:border-accent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Họ tên *
                                    </label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-2 bg-background border rounded-lg text-foreground focus:outline-none ${formErrors.fullName ? "border-error" : "border-border focus:border-accent"
                                            }`}
                                    />
                                    {formErrors.fullName && (
                                        <p className="mt-1 text-xs text-error">{formErrors.fullName}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Số điện thoại *
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 bg-background border rounded-lg text-foreground focus:outline-none ${formErrors.phone ? "border-error" : "border-border focus:border-accent"
                                        }`}
                                />
                                {formErrors.phone && (
                                    <p className="mt-1 text-xs text-error">{formErrors.phone}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Tỉnh/Thành *
                                    </label>
                                    <select
                                        name="provinceId"
                                        value={formData.provinceId}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-2 bg-background border rounded-lg text-foreground focus:outline-none ${formErrors.provinceId ? "border-error" : "border-border focus:border-accent"
                                            }`}
                                    >
                                        <option value="">Chọn</option>
                                        {provinces.map((p) => (
                                            <option key={p.code} value={p.code}>{p.name}</option>
                                        ))}
                                    </select>
                                    {formErrors.provinceId && (
                                        <p className="mt-1 text-xs text-error">{formErrors.provinceId}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Phường/Xã (Quận/Huyện) *
                                    </label>
                                    <select
                                        name="wardId"
                                        value={formData.wardId}
                                        onChange={handleChange}
                                        disabled={!formData.provinceId}
                                        className={`w-full px-4 py-2 bg-background border rounded-lg text-foreground focus:outline-none disabled:opacity-50 ${formErrors.wardId ? "border-error" : "border-border focus:border-accent"
                                            }`}
                                    >
                                        <option value="">Chọn</option>
                                        {wards.map((w) => (
                                            <option key={w.code} value={w.code}>{w.name}</option>
                                        ))}
                                    </select>
                                    {formErrors.wardId && (
                                        <p className="mt-1 text-xs text-error">{formErrors.wardId}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Địa chỉ chi tiết *
                                </label>
                                <input
                                    type="text"
                                    name="streetAddress"
                                    value={formData.streetAddress}
                                    onChange={handleChange}
                                    placeholder="Số nhà, tên đường..."
                                    className={`w-full px-4 py-2 bg-background border rounded-lg text-foreground placeholder-muted focus:outline-none ${formErrors.streetAddress ? "border-error" : "border-border focus:border-accent"
                                        }`}
                                />
                                {formErrors.streetAddress && (
                                    <p className="mt-1 text-xs text-error">{formErrors.streetAddress}</p>
                                )}
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="isDefault"
                                    checked={formData.isDefault}
                                    onChange={handleChange}
                                    className="w-4 h-4 text-accent focus:ring-accent border-border rounded"
                                />
                                <span className="text-sm text-foreground">Đặt làm địa chỉ mặc định</span>
                            </label>
                        </form>

                        {/* Modal Footer */}
                        <div className="flex gap-3 p-4 border-t border-border">
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="btn btn-outline flex-1"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={formLoading}
                                className="btn btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {formLoading && (
                                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                )}
                                {editingAddress ? "Lưu thay đổi" : "Thêm địa chỉ"}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

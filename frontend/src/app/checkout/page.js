"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { locationAPI, ordersAPI, paymentAPI, addressAPI, loyaltyAPI } from "@/lib/api";
import { formatPrice, getImageUrl, isValidEmail, isValidPhone } from "@/lib/utils";

// Icons
const ChevronLeftIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
);

const CheckIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

const LockIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
);

const TruckIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
);

const CreditCardIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
);

const PlusIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const steps = [
    { id: 1, name: "Thông tin", icon: "1" },
    { id: 2, name: "Giao hàng", icon: "2" },
    { id: 3, name: "Thanh toán", icon: "3" },
];

export default function CheckoutPage() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const { cart, clearCart } = useCart();

    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Saved addresses
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [showNewAddressForm, setShowNewAddressForm] = useState(false);
    const [addressLoading, setAddressLoading] = useState(true);

    // Tier discount
    const [tierDiscount, setTierDiscount] = useState(null);

    // Location data (for new address form)
    const [provinces, setProvinces] = useState([]);
    const [wards, setWards] = useState([]);

    // Form data
    const [formData, setFormData] = useState({
        // Contact info
        email: user?.email || "",
        phone: user?.phone || "",
        fullName: user?.fullName || "",

        // Shipping address (for new address)
        provinceId: "",
        provinceName: "",
        wardId: "",
        wardName: "",
        streetAddress: "",

        // Shipping method
        shippingMethod: "standard",

        // Payment method
        paymentMethod: "COD",

        // Notes
        notes: "",
    });

    const [formErrors, setFormErrors] = useState({});

    // Fetch saved addresses and tier discount on mount
    useEffect(() => {
        if (isAuthenticated) {
            fetchSavedAddresses();
            fetchTierDiscount();
        } else {
            setAddressLoading(false);
            setShowNewAddressForm(true);
        }
        fetchProvinces();
    }, [isAuthenticated]);

    const fetchTierDiscount = async () => {
        try {
            const response = await loyaltyAPI.checkDiscount();
            if (response.success) {
                setTierDiscount(response.data);
            }
        } catch (err) {
            console.error("Failed to fetch tier discount:", err);
        }
    };

    // Fetch wards when province changes
    useEffect(() => {
        if (formData.provinceId) {
            fetchWards(formData.provinceId);
        } else {
            setWards([]);
        }
    }, [formData.provinceId]);

    const fetchSavedAddresses = async () => {
        try {
            const response = await addressAPI.getAll();
            if (response.success && response.data?.length > 0) {
                setSavedAddresses(response.data);
                // Auto-select default address or first address
                const defaultAddr = response.data.find(a => a.isDefault) || response.data[0];
                if (defaultAddr) {
                    setSelectedAddressId(defaultAddr.id);
                }
            } else {
                setShowNewAddressForm(true);
            }
        } catch (err) {
            console.error("Failed to fetch addresses:", err);
            setShowNewAddressForm(true);
        } finally {
            setAddressLoading(false);
        }
    };

    const fetchProvinces = async () => {
        try {
            const data = await locationAPI.getProvinces();
            setProvinces(data || []);
        } catch (err) {
            console.error("Failed to fetch provinces:", err);
        }
    };

    const fetchWards = async (provinceId) => {
        try {
            const data = await locationAPI.getProvinceDetails(provinceId);
            // API returns { ...province, wards: [] } - these are districts but we use them as wards
            setWards(data.wards || []);
        } catch (err) {
            console.error("Failed to fetch wards:", err);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "provinceId") {
            const selectedProvince = provinces.find(p => p.code == value);
            setFormData(prev => ({
                ...prev,
                provinceId: value,
                provinceName: selectedProvince ? selectedProvince.name : "",
                wardId: "",
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

        setFormData((prev) => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const handleSelectAddress = (addressId) => {
        setSelectedAddressId(addressId);
        setShowNewAddressForm(false);
    };

    const handleShowNewAddressForm = () => {
        setSelectedAddressId(null);
        setShowNewAddressForm(true);
    };

    const validateStep = (step) => {
        const errors = {};

        if (step === 1) {
            if (!formData.fullName.trim()) {
                errors.fullName = "Vui lòng nhập họ tên";
            }
            if (!formData.email.trim()) {
                errors.email = "Vui lòng nhập email";
            } else if (!isValidEmail(formData.email)) {
                errors.email = "Email không hợp lệ";
            }
            if (!formData.phone.trim()) {
                errors.phone = "Vui lòng nhập số điện thoại";
            } else if (!isValidPhone(formData.phone)) {
                errors.phone = "Số điện thoại không hợp lệ";
            }
        }

        if (step === 2) {
            // If using saved address, check if one is selected
            if (!showNewAddressForm && !selectedAddressId) {
                errors.address = "Vui lòng chọn địa chỉ giao hàng";
            }
            // If using new address form, validate the form
            if (showNewAddressForm) {
                if (!formData.provinceId) {
                    errors.provinceId = "Vui lòng chọn tỉnh/thành phố";
                }
                if (!formData.wardId) {
                    errors.wardId = "Vui lòng chọn phường/xã";
                }
                if (!formData.streetAddress.trim()) {
                    errors.streetAddress = "Vui lòng nhập địa chỉ chi tiết";
                }
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleNextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep((prev) => Math.min(prev + 1, 3));
        }
    };

    const handlePrevStep = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 1));
    };

    const getSelectedAddress = () => {
        if (selectedAddressId) {
            return savedAddresses.find(a => a.id === selectedAddressId);
        }
        return null;
    };

    const handleSubmitOrder = async () => {
        if (!validateStep(3)) return;

        setLoading(true);
        setError("");

        try {
            let addressId = selectedAddressId;

            // If using new address, create it first
            if (showNewAddressForm) {
                const newAddressResponse = await addressAPI.create({
                    fullName: formData.fullName,
                    phone: formData.phone,
                    provinceId: parseInt(formData.provinceId),
                    provinceName: formData.provinceName,
                    wardId: parseInt(formData.wardId),
                    wardName: formData.wardName,
                    streetAddress: formData.streetAddress,
                    isDefault: savedAddresses.length === 0, // Make default if first address
                });

                if (newAddressResponse.success) {
                    addressId = newAddressResponse.data.id;
                } else {
                    throw new Error(newAddressResponse.message || "Không thể tạo địa chỉ mới");
                }
            }

            // Build order data
            const orderData = {
                addressId,
                paymentMethod: formData.paymentMethod,
                shippingMethod: formData.shippingMethod,
                notes: formData.notes,
                items: cart.items.map((item) => ({
                    variantId: item.variant?.id || item.variantId,
                    quantity: item.quantity,
                })),
            };

            // Create order
            const response = await ordersAPI.create(orderData);

            if (response.success) {
                const order = response.data;

                // Handle payment
                if (formData.paymentMethod === "VNPAY") {
                    // Redirect to VNPAY payment
                    const paymentResponse = await paymentAPI.createVNPayUrl(order.id);
                    if (paymentResponse.success) {
                        window.location.href = paymentResponse.data.paymentUrl;
                        return;
                    }
                }

                // COD - clear cart and redirect to success page
                await clearCart();
                router.push(`/checkout/success?orderNumber=${order.orderNumber}`);
            } else {
                throw new Error(response.message || "Đặt hàng thất bại");
            }
        } catch (err) {
            setError(err.message || "Đã có lỗi xảy ra. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    // Calculate totals
    const subtotal = cart.total;
    const shippingFee = formData.shippingMethod === "express" ? 30000 : 0;
    const tierDiscountAmount = tierDiscount?.eligible
        ? Math.floor((subtotal * tierDiscount.discountPercent) / 100)
        : 0;
    const total = subtotal + shippingFee - tierDiscountAmount;

    // Get selected address for display
    const selectedAddress = getSelectedAddress();

    // Redirect if cart is empty
    if (cart.items.length === 0) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center py-16 px-4">
                <h1 className="text-2xl font-bold text-foreground mb-4">Giỏ hàng trống</h1>
                <p className="text-muted mb-6">Hãy thêm sản phẩm vào giỏ hàng để thanh toán</p>
                <Link
                    href="/products"
                    className="btn btn-primary"
                >
                    Tiếp tục mua sắm
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-secondary">
            {/* Header */}
            <div className="bg-background border-b border-border">
                <div className="container py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/cart" className="flex items-center gap-2 text-muted hover:text-foreground transition-colors">
                            <ChevronLeftIcon />
                            <span>Quay lại giỏ hàng</span>
                        </Link>
                        <Link href="/" className="text-xl font-bold">
                            <span className="text-accent">CLOTHING</span>
                            <span className="text-foreground">SHOP</span>
                        </Link>
                        <div className="flex items-center gap-1 text-sm text-muted">
                            <LockIcon />
                            <span>Thanh toán an toàn</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="bg-background border-b border-border">
                <div className="container py-6">
                    <div className="flex items-center justify-center">
                        {steps.map((step, index) => (
                            <div key={step.id} className="flex items-center">
                                <div
                                    className={`flex items-center gap-2 ${currentStep >= step.id ? "text-accent" : "text-muted"
                                        }`}
                                >
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep > step.id
                                            ? "bg-accent text-white"
                                            : currentStep === step.id
                                                ? "bg-accent/10 text-accent border-2 border-accent"
                                                : "bg-secondary text-muted"
                                            }`}
                                    >
                                        {currentStep > step.id ? <CheckIcon /> : step.icon}
                                    </div>
                                    <span className="hidden sm:block font-medium">{step.name}</span>
                                </div>
                                {index < steps.length - 1 && (
                                    <div
                                        className={`w-12 sm:w-24 h-0.5 mx-2 sm:mx-4 ${currentStep > step.id ? "bg-accent" : "bg-border"
                                            }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="container py-8">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Form */}
                    <div className="lg:col-span-2">
                        {error && (
                            <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
                                {error}
                            </div>
                        )}

                        <div className="bg-card rounded-xl border border-border p-6">
                            {/* Step 1: Contact Info */}
                            {currentStep === 1 && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-semibold text-foreground">
                                        Thông tin liên hệ
                                    </h2>

                                    <div className="grid gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">
                                                Họ và tên <span className="text-error">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="fullName"
                                                value={formData.fullName}
                                                onChange={handleChange}
                                                placeholder="Nguyễn Văn A"
                                                className={`w-full px-4 py-3 bg-background border rounded-lg text-foreground placeholder-muted focus:outline-none transition-colors ${formErrors.fullName ? "border-error" : "border-border focus:border-accent"
                                                    }`}
                                            />
                                            {formErrors.fullName && (
                                                <p className="mt-1 text-sm text-error">{formErrors.fullName}</p>
                                            )}
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-2">
                                                    Email <span className="text-error">*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    placeholder="your@email.com"
                                                    className={`w-full px-4 py-3 bg-background border rounded-lg text-foreground placeholder-muted focus:outline-none transition-colors ${formErrors.email ? "border-error" : "border-border focus:border-accent"
                                                        }`}
                                                />
                                                {formErrors.email && (
                                                    <p className="mt-1 text-sm text-error">{formErrors.email}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-2">
                                                    Số điện thoại <span className="text-error">*</span>
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
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Shipping */}
                            {currentStep === 2 && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-semibold text-foreground">
                                        Địa chỉ giao hàng
                                    </h2>

                                    {addressLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    ) : (
                                        <>
                                            {/* Saved Addresses */}
                                            {savedAddresses.length > 0 && !showNewAddressForm && (
                                                <div className="space-y-3">
                                                    <p className="text-sm text-muted">Chọn địa chỉ đã lưu:</p>
                                                    {savedAddresses.map((address) => (
                                                        <label
                                                            key={address.id}
                                                            className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${selectedAddressId === address.id
                                                                ? "border-accent bg-accent/5"
                                                                : "border-border hover:border-accent/50"
                                                                }`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name="selectedAddress"
                                                                checked={selectedAddressId === address.id}
                                                                onChange={() => handleSelectAddress(address.id)}
                                                                className="mt-1 w-4 h-4 text-accent"
                                                            />
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-foreground">{address.fullName}</span>
                                                                    {address.isDefault && (
                                                                        <span className="text-xs text-success font-medium">Mặc định</span>
                                                                    )}
                                                                </div>
                                                                <p className="text-sm text-muted mt-1">{address.phone}</p>
                                                                <p className="text-sm text-muted">
                                                                    {address.streetAddress}, {address.wardName}, {address.provinceName}
                                                                </p>
                                                            </div>
                                                        </label>
                                                    ))}

                                                    <button
                                                        type="button"
                                                        onClick={handleShowNewAddressForm}
                                                        className="flex items-center gap-2 text-accent hover:text-accent-hover font-medium text-sm transition-colors"
                                                    >
                                                        <PlusIcon />
                                                        Thêm địa chỉ mới
                                                    </button>

                                                    {formErrors.address && (
                                                        <p className="text-sm text-error">{formErrors.address}</p>
                                                    )}
                                                </div>
                                            )}

                                            {/* New Address Form */}
                                            {showNewAddressForm && (
                                                <div className="space-y-4">
                                                    {savedAddresses.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setShowNewAddressForm(false);
                                                                const defaultAddr = savedAddresses.find(a => a.isDefault) || savedAddresses[0];
                                                                if (defaultAddr) setSelectedAddressId(defaultAddr.id);
                                                            }}
                                                            className="text-sm text-accent hover:text-accent-hover font-medium"
                                                        >
                                                            ← Chọn từ địa chỉ đã lưu
                                                        </button>
                                                    )}

                                                    <div className="grid sm:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-foreground mb-2">
                                                                Tỉnh/Thành phố <span className="text-error">*</span>
                                                            </label>
                                                            <select
                                                                name="provinceId"
                                                                value={formData.provinceId}
                                                                onChange={handleChange}
                                                                className={`w-full px-4 py-3 bg-background border rounded-lg text-foreground focus:outline-none transition-colors ${formErrors.provinceId ? "border-error" : "border-border focus:border-accent"
                                                                    }`}
                                                            >
                                                                <option value="">Chọn tỉnh/thành</option>
                                                                {provinces.map((p) => (
                                                                    <option key={p.code} value={p.code}>
                                                                        {p.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {formErrors.provinceId && (
                                                                <p className="mt-1 text-sm text-error">{formErrors.provinceId}</p>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-foreground mb-2">
                                                                Phường/Xã (Quận/Huyện) <span className="text-error">*</span>
                                                            </label>
                                                            <select
                                                                name="wardId"
                                                                value={formData.wardId}
                                                                onChange={handleChange}
                                                                disabled={!formData.provinceId}
                                                                className={`w-full px-4 py-3 bg-background border rounded-lg text-foreground focus:outline-none transition-colors disabled:opacity-50 ${formErrors.wardId ? "border-error" : "border-border focus:border-accent"
                                                                    }`}
                                                            >
                                                                <option value="">Chọn phường/xã</option>
                                                                {wards.map((w) => (
                                                                    <option key={w.code} value={w.code}>
                                                                        {w.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {formErrors.wardId && (
                                                                <p className="mt-1 text-sm text-error">{formErrors.wardId}</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-foreground mb-2">
                                                            Địa chỉ chi tiết <span className="text-error">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="streetAddress"
                                                            value={formData.streetAddress}
                                                            onChange={handleChange}
                                                            placeholder="Số nhà, tên đường..."
                                                            className={`w-full px-4 py-3 bg-background border rounded-lg text-foreground placeholder-muted focus:outline-none transition-colors ${formErrors.streetAddress ? "border-error" : "border-border focus:border-accent"
                                                                }`}
                                                        />
                                                        {formErrors.streetAddress && (
                                                            <p className="mt-1 text-sm text-error">{formErrors.streetAddress}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Ghi chú (tùy chọn)
                                        </label>
                                        <textarea
                                            name="notes"
                                            value={formData.notes}
                                            onChange={handleChange}
                                            placeholder="Ghi chú cho người giao hàng..."
                                            rows={3}
                                            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:border-accent transition-colors resize-none"
                                        />
                                    </div>

                                    {/* Shipping Method */}
                                    <div className="pt-6 border-t border-border">
                                        <h3 className="text-lg font-semibold text-foreground mb-4">
                                            Phương thức vận chuyển
                                        </h3>
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-4 p-4 border border-border rounded-lg cursor-pointer hover:border-accent transition-colors">
                                                <input
                                                    type="radio"
                                                    name="shippingMethod"
                                                    value="standard"
                                                    checked={formData.shippingMethod === "standard"}
                                                    onChange={handleChange}
                                                    className="w-4 h-4 text-accent"
                                                />
                                                <TruckIcon />
                                                <div className="flex-1">
                                                    <p className="font-medium text-foreground">Giao hàng tiêu chuẩn</p>
                                                    <p className="text-sm text-muted">3-5 ngày làm việc</p>
                                                </div>
                                                <span className="font-medium text-foreground">
                                                    Miễn phí
                                                </span>
                                            </label>

                                            <label className="flex items-center gap-4 p-4 border border-border rounded-lg cursor-pointer hover:border-accent transition-colors">
                                                <input
                                                    type="radio"
                                                    name="shippingMethod"
                                                    value="express"
                                                    checked={formData.shippingMethod === "express"}
                                                    onChange={handleChange}
                                                    className="w-4 h-4 text-accent"
                                                />
                                                <TruckIcon />
                                                <div className="flex-1">
                                                    <p className="font-medium text-foreground">Giao hàng nhanh</p>
                                                    <p className="text-sm text-muted">1-2 ngày làm việc</p>
                                                </div>
                                                <span className="font-medium text-foreground">{formatPrice(30000)}</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Payment */}
                            {currentStep === 3 && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-semibold text-foreground">
                                        Phương thức thanh toán
                                    </h2>

                                    <div className="space-y-3">
                                        <label className="flex items-center gap-4 p-4 border border-border rounded-lg cursor-pointer hover:border-accent transition-colors">
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="COD"
                                                checked={formData.paymentMethod === "COD"}
                                                onChange={handleChange}
                                                className="w-4 h-4 text-accent"
                                            />
                                            <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                                                💵
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-foreground">Thanh toán khi nhận hàng (COD)</p>
                                                <p className="text-sm text-muted">Trả tiền mặt khi nhận hàng</p>
                                            </div>
                                        </label>

                                        <label className="flex items-center gap-4 p-4 border border-border rounded-lg cursor-pointer hover:border-accent transition-colors">
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="VNPAY"
                                                checked={formData.paymentMethod === "VNPAY"}
                                                onChange={handleChange}
                                                className="w-4 h-4 text-accent"
                                            />
                                            <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                                                <CreditCardIcon />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-foreground">VNPAY</p>
                                                <p className="text-sm text-muted">Thanh toán qua thẻ ATM/Visa/MasterCard</p>
                                            </div>
                                        </label>


                                    </div>

                                    {/* Order Summary Preview */}
                                    <div className="pt-6 border-t border-border">
                                        <h3 className="text-lg font-semibold text-foreground mb-4">
                                            Xác nhận đơn hàng
                                        </h3>
                                        <div className="space-y-4 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted">Người nhận:</span>
                                                <span className="text-foreground font-medium">{formData.fullName}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted">Số điện thoại:</span>
                                                <span className="text-foreground">{formData.phone}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted">Email:</span>
                                                <span className="text-foreground">{formData.email}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted">Địa chỉ:</span>
                                                <span className="text-foreground text-right max-w-[60%]">
                                                    {selectedAddress
                                                        ? `${selectedAddress.streetAddress}, ${selectedAddress.wardName}, ${selectedAddress.provinceName}`
                                                        : `${formData.streetAddress}, ${formData.wardName}, ${formData.provinceName}`
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="flex justify-between mt-8 pt-6 border-t border-border">
                                {currentStep > 1 ? (
                                    <button
                                        onClick={handlePrevStep}
                                        className="btn btn-outline"
                                    >
                                        Quay lại
                                    </button>
                                ) : (
                                    <div />
                                )}

                                {currentStep < 3 ? (
                                    <button
                                        onClick={handleNextStep}
                                        className="btn btn-primary"
                                    >
                                        Tiếp tục
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSubmitOrder}
                                        disabled={loading}
                                        className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading && (
                                            <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        )}
                                        Đặt hàng
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-card rounded-xl border border-border p-6 sticky top-24">
                            <h2 className="text-lg font-semibold text-foreground mb-6">
                                Đơn hàng ({cart.itemCount} sản phẩm)
                            </h2>

                            {/* Cart Items */}
                            <div className="space-y-4 max-h-64 overflow-y-auto">
                                {cart.items.map((item) => {
                                    const product = item.product || item.variant?.product;
                                    const imageUrl = getImageUrl(
                                        product?.image || product?.images?.[0]?.url || item.variant?.images?.[0]?.url,
                                        "/images/placeholder.jpg"
                                    );
                                    const productName = product?.name || item.variant?.productName || "Sản phẩm";

                                    return (
                                        <div key={item.id} className="flex gap-3">
                                            <div className="relative w-16 h-20 bg-secondary rounded-lg overflow-hidden flex-shrink-0">
                                                <Image
                                                    src={imageUrl}
                                                    alt={productName}
                                                    fill
                                                    className="object-cover"
                                                    sizes="64px"
                                                    unoptimized
                                                />
                                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-white text-xs font-bold rounded-full flex items-center justify-center">
                                                    {item.quantity}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground line-clamp-2">
                                                    {productName}
                                                </p>
                                                <p className="text-xs text-muted mt-1">
                                                    {item.variant?.size} / {item.variant?.color}
                                                </p>
                                                <p className="text-sm font-medium text-foreground mt-1">
                                                    {formatPrice(item.variant?.price)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Totals */}
                            <div className="mt-6 pt-6 border-t border-border space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted">Tạm tính</span>
                                    <span className="text-foreground">{formatPrice(subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted">Phí vận chuyển</span>
                                    <span className={shippingFee === 0 ? "text-success" : "text-foreground"}>
                                        {shippingFee === 0 ? "Miễn phí" : formatPrice(shippingFee)}
                                    </span>
                                </div>
                                {tierDiscountAmount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted">
                                            Giảm giá thành viên ({tierDiscount?.discountPercent}%)
                                        </span>
                                        <span className="text-success">-{formatPrice(tierDiscountAmount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between pt-3 border-t border-border">
                                    <span className="text-lg font-semibold text-foreground">Tổng cộng</span>
                                    <span className="text-xl font-bold text-accent">{formatPrice(total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import { formatPrice, formatDate, getOrderStatusInfo, getImageUrl } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { canTransitionOrderStatus, filterStatusOptionsByRole } from "@/lib/permissions";

// Icons
const ArrowLeftIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
);

const CheckIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

const CloseIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const PrintIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
    </svg>
);

// Payment method labels
const paymentMethodLabels = {
    COD: "Thanh toán khi nhận hàng",
    VNPAY: "VNPAY",
    BANK_TRANSFER: "Chuyển khoản ngân hàng",
};

// Payment status config
const paymentStatusConfig = {
    UNPAID: { label: "Chưa thanh toán", class: "badge-warning" },
    PENDING: { label: "Đang xử lý", class: "badge-warning" },
    PAID: { label: "Đã thanh toán", class: "badge-success" },
    FAILED: { label: "Thất bại", class: "badge-error" },
    REFUNDED: { label: "Đã hoàn tiền", class: "badge-accent" },
};

export default function AdminOrderDetailPage() {
    const router = useRouter();
    const params = useParams();
    const orderId = params.id;
    const { user } = useAuth();
    const userRole = user?.role?.name || user?.role;

    const [order, setOrder] = useState(null);
    const [nextStatuses, setNextStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState("");
    const [statusNote, setStatusNote] = useState("");
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(null);

    useEffect(() => {
        fetchOrder();
    }, [orderId]);

    const fetchOrder = async () => {
        try {
            const token = localStorage.getItem("accessToken");
            const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Order not found");
            }

            setOrder(result.data);
            // Filter next statuses based on user role permissions
            const allNextStatuses = result.data.nextStatuses || [];
            const filteredStatuses = allNextStatuses.filter(status =>
                canTransitionOrderStatus(userRole, result.data.status, status.value)
            );
            setNextStatuses(filteredStatuses);
        } catch (err) {
            console.error("Failed to fetch order:", err);
            setError(err.message || "Không thể tải thông tin đơn hàng");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async () => {
        if (!selectedStatus) return;

        setUpdating(true);
        try {
            const token = localStorage.getItem("accessToken");
            const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    status: selectedStatus.value,
                    note: statusNote,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Failed to update status");
            }

            // Refresh order data
            await fetchOrder();
            setShowStatusModal(false);
            setStatusNote("");
            setSelectedStatus(null);
        } catch (err) {
            console.error("Failed to update status:", err);
            setError(err.message || "Không thể cập nhật trạng thái");
        } finally {
            setUpdating(false);
        }
    };

    const openStatusModal = (status) => {
        setSelectedStatus(status);
        setShowStatusModal(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error && !order) {
        return (
            <div className="text-center py-16">
                <p className="text-error mb-4">{error}</p>
                <button
                    onClick={() => router.back()}
                    className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover"
                >
                    Quay lại
                </button>
            </div>
        );
    }

    const statusInfo = getOrderStatusInfo(order?.status);
    const paymentStatus = paymentStatusConfig[order?.paymentStatus] || paymentStatusConfig.UNPAID;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 text-muted hover:text-foreground transition-colors"
                    >
                        <ArrowLeftIcon />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Đơn hàng #{order?.orderNumber}
                        </h1>
                        <p className="text-muted mt-1">
                            Đặt lúc {formatDate(order?.createdAt)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-secondary transition-colors"
                    >
                        <PrintIcon />
                        In đơn
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Order Status Card */}
                    <div className="bg-card rounded-xl border border-border p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-foreground">Trạng thái đơn hàng</h2>
                            <span className={`badge ${statusInfo.bgClass}`}>{statusInfo.label}</span>
                        </div>

                        {/* Status Actions */}
                        {nextStatuses.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-border">
                                <p className="text-sm text-muted mb-3">Cập nhật trạng thái:</p>
                                <div className="flex flex-wrap gap-2">
                                    {nextStatuses.map((status) => (
                                        <button
                                            key={status.value}
                                            onClick={() => openStatusModal(status)}
                                            className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
                                        >
                                            → {status.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Status History */}
                        {order?.statusHistory && order.statusHistory.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-border">
                                <p className="text-sm text-muted mb-3">Lịch sử trạng thái:</p>
                                <div className="space-y-2">
                                    {order.statusHistory.slice(0, 5).map((history, index) => {
                                        const historyStatus = getOrderStatusInfo(history.toStatus);
                                        return (
                                            <div key={history.id || index} className="flex items-start gap-3 text-sm">
                                                <div className="w-2 h-2 mt-1.5 bg-accent rounded-full flex-shrink-0" />
                                                <div className="flex-1">
                                                    <span className="font-medium text-foreground">
                                                        {historyStatus.label}
                                                    </span>
                                                    {history.note && (
                                                        <span className="text-muted"> - {history.note}</span>
                                                    )}
                                                    <p className="text-xs text-muted">
                                                        {formatDate(history.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Order Items */}
                    <div className="bg-card rounded-xl border border-border overflow-hidden">
                        <div className="p-6 border-b border-border">
                            <h2 className="text-lg font-semibold text-foreground">
                                Sản phẩm ({order?.items?.length || 0})
                            </h2>
                        </div>
                        <div className="divide-y divide-border">
                            {order?.items?.map((item) => (
                                <div key={item.id} className="flex gap-4 p-4">
                                    <div className="w-16 h-20 bg-secondary rounded-lg overflow-hidden relative flex-shrink-0">
                                        {item.variant?.images?.[0]?.url ? (
                                            <Image
                                                src={getImageUrl(item.variant.images[0].url)}
                                                alt={item.productName}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-muted text-xs">
                                                No image
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-foreground truncate">
                                            {item.productName}
                                        </h3>
                                        <p className="text-sm text-muted">{item.variantInfo}</p>
                                        <p className="text-xs text-muted">SKU: {item.sku}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-foreground">
                                            {formatPrice(item.unitPrice)}
                                        </p>
                                        <p className="text-sm text-muted">x{item.quantity}</p>
                                        <p className="text-sm font-medium text-accent">
                                            {formatPrice(item.totalPrice)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Customer Info */}
                    <div className="bg-card rounded-xl border border-border p-6">
                        <h3 className="font-semibold text-foreground mb-4">Thông tin khách hàng</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-muted">Họ tên</p>
                                <p className="font-medium text-foreground">
                                    {order?.user?.fullName || order?.address?.fullName || "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted">Email</p>
                                <p className="text-foreground">{order?.user?.email || "—"}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted">Số điện thoại</p>
                                <p className="text-foreground">
                                    {order?.address?.phone || order?.user?.phone || "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted">Thành viên</p>
                                <p className="text-foreground">
                                    {order?.user?.tier?.name || "Thường"} - {order?.user?.loyaltyPoints || 0} điểm
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="bg-card rounded-xl border border-border p-6">
                        <h3 className="font-semibold text-foreground mb-4">Địa chỉ giao hàng</h3>
                        <div className="text-foreground">
                            <p className="font-medium">{order?.address?.fullName}</p>
                            <p className="text-sm text-muted mt-1">{order?.address?.phone}</p>
                            <p className="text-sm mt-2">
                                {order?.address?.streetAddress}
                                {order?.address?.ward && `, ${order.address.ward.name}`}
                                {order?.address?.district && `, ${order.address.district.name}`}
                                {order?.address?.province && `, ${order.address.province.name}`}
                            </p>
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="bg-card rounded-xl border border-border p-6">
                        <h3 className="font-semibold text-foreground mb-4">Thanh toán</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-muted">Phương thức</span>
                                <span className="font-medium text-foreground">
                                    {paymentMethodLabels[order?.paymentMethod] || order?.paymentMethod}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted">Trạng thái</span>
                                <span className={`badge ${paymentStatus.class}`}>{paymentStatus.label}</span>
                            </div>
                            {order?.payment?.transactionId && (
                                <div className="flex items-center justify-between">
                                    <span className="text-muted">Mã GD</span>
                                    <span className="text-sm text-foreground">{order.payment.transactionId}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-card rounded-xl border border-border p-6">
                        <h3 className="font-semibold text-foreground mb-4">Tổng đơn hàng</h3>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted">Tạm tính</span>
                                <span className="text-foreground">{formatPrice(order?.subtotal)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted">Phí vận chuyển</span>
                                <span className="text-foreground">{formatPrice(order?.shippingFee)}</span>
                            </div>
                            {order?.discountAmount > 0 && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted">Giảm giá</span>
                                    <span className="text-success">-{formatPrice(order?.discountAmount)}</span>
                                </div>
                            )}
                            {order?.loyaltyDiscount > 0 && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted">Giảm thành viên</span>
                                    <span className="text-success">-{formatPrice(order?.loyaltyDiscount)}</span>
                                </div>
                            )}
                            <div className="pt-2 mt-2 border-t border-border flex items-center justify-between">
                                <span className="font-semibold text-foreground">Tổng cộng</span>
                                <span className="text-xl font-bold text-accent">
                                    {formatPrice(order?.totalAmount)}
                                </span>
                            </div>
                            {order?.loyaltyPointsEarned > 0 && (
                                <div className="flex items-center justify-between text-sm pt-2">
                                    <span className="text-muted">Điểm thưởng</span>
                                    <span className="text-accent">+{order.loyaltyPointsEarned} điểm</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Order Notes */}
                    {order?.note && (
                        <div className="bg-card rounded-xl border border-border p-6">
                            <h3 className="font-semibold text-foreground mb-2">Ghi chú</h3>
                            <p className="text-sm text-muted">{order.note}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Status Update Modal */}
            {showStatusModal && selectedStatus && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-50"
                        onClick={() => setShowStatusModal(false)}
                    />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-xl z-50 overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h3 className="text-lg font-semibold text-foreground">
                                Cập nhật trạng thái
                            </h3>
                            <button
                                onClick={() => setShowStatusModal(false)}
                                className="p-2 text-muted hover:text-foreground"
                            >
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="p-4 bg-secondary/50 rounded-lg">
                                <p className="text-sm text-muted mb-1">Chuyển sang trạng thái:</p>
                                <p className="font-semibold text-foreground">{selectedStatus.label}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Ghi chú (tùy chọn)
                                </label>
                                <textarea
                                    value={statusNote}
                                    onChange={(e) => setStatusNote(e.target.value)}
                                    rows={3}
                                    placeholder="Nhập ghi chú cho trạng thái mới..."
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:border-accent resize-none"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowStatusModal(false)}
                                    className="flex-1 py-2 border border-border text-foreground font-medium rounded-lg hover:bg-secondary"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={handleStatusUpdate}
                                    disabled={updating}
                                    className="flex-1 py-2 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {updating ? (
                                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <CheckIcon />
                                    )}
                                    Xác nhận
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

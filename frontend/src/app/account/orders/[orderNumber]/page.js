"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ordersAPI, paymentAPI } from "@/lib/api";
import { formatPrice, formatDate, getOrderStatusInfo, getImageUrl } from "@/lib/utils";
import { useSocket, SOCKET_EVENTS } from "@/context/SocketContext";
import CountdownTimer from "@/components/common/CountdownTimer";

// Icons
const ChevronLeftIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
);

const PackageIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
);

const TruckIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
);

const CheckCircleIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const XCircleIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const orderNumber = params.orderNumber;

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [cancelling, setCancelling] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [showConfirmRefundModal, setShowConfirmRefundModal] = useState(false);
    const [refundReason, setRefundReason] = useState("");

    useEffect(() => {
        if (orderNumber) {
            fetchOrder();
        }
    }, [orderNumber]);

    const fetchOrder = useCallback(async () => {
        try {
            const response = await ordersAPI.getByOrderNumber(orderNumber);
            if (response.success) {
                setOrder(response.data);
            } else {
                setError("Không tìm thấy đơn hàng");
            }
        } catch (err) {
            console.error("Failed to fetch order:", err);
            setError(err.message || "Không thể tải thông tin đơn hàng");
        } finally {
            setLoading(false);
        }
    }, [orderNumber]);

    // Subscribe to real-time order updates
    const { subscribe, unsubscribe } = useSocket();

    useEffect(() => {
        if (!order) return;

        const handleStatusUpdate = (data) => {
            if (data.orderNumber === order.orderNumber) {
                console.log('[Order] Real-time update received:', data);
                fetchOrder(); // Refresh order data
            }
        };

        const handleOrderCancelled = (data) => {
            if (data.orderNumber === order.orderNumber) {
                console.log('[Order] Order cancelled:', data);
                fetchOrder(); // Refresh order data
            }
        };

        subscribe(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleStatusUpdate);
        subscribe(SOCKET_EVENTS.ORDER_CANCELLED, handleOrderCancelled);

        return () => {
            unsubscribe(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleStatusUpdate);
            unsubscribe(SOCKET_EVENTS.ORDER_CANCELLED, handleOrderCancelled);
        };
    }, [order?.orderNumber, subscribe, unsubscribe, fetchOrder]);

    const handleCancelOrder = async () => {
        if (!confirm("Bạn có chắc muốn hủy đơn hàng này?")) return;

        setCancelling(true);
        try {
            const response = await ordersAPI.cancel(order.id, "Khách hàng yêu cầu hủy");
            if (response.success) {
                await fetchOrder();
            }
        } catch (err) {
            alert(err.message || "Không thể hủy đơn hàng");
        } finally {
            setCancelling(false);
        }
    };

    const handleRepay = async () => {
        setLoading(true);
        try {
            const response = await paymentAPI.createVNPayUrl(order.id);
            if (response.success) {
                window.location.href = response.data.paymentUrl;
            } else {
                alert(response.message || "Không thể tạo link thanh toán");
                setLoading(false);
            }
        } catch (err) {
            alert(err.message || "Lỗi thanh toán lại");
            setLoading(false);
        }
    };

    const handleConfirmReceived = async () => {
        const isRefund = order.status === "REFUNDED";

        if (isRefund) {
            setShowConfirmRefundModal(true);
            return;
        }

        if (!confirm("Bạn xác nhận đã nhận được hàng và hài lòng với sản phẩm?")) return;

        setLoading(true);
        try {
            const response = await ordersAPI.confirmReceived(order.id);
            if (response.success) {
                fetchOrder();
            } else {
                alert(response.message || "Lỗi xác nhận");
            }
        } catch (err) {
            alert(err.message || "Lỗi xác nhận");
        } finally {
            setLoading(false);
        }
    };

    const submitConfirmRefund = async () => {
        setLoading(true);
        try {
            const response = await ordersAPI.confirmReceived(order.id);
            if (response.success) {
                setShowConfirmRefundModal(false);
                fetchOrder();
            } else {
                alert(response.message || "Lỗi xác nhận");
            }
        } catch (err) {
            alert(err.message || "Lỗi xác nhận");
        } finally {
            setLoading(false);
        }
    };

    const handleRequestRefund = () => {
        setRefundReason("");
        setShowRefundModal(true);
    };

    const submitRefundRequest = async () => {
        if (!refundReason || refundReason.length < 10) {
            alert("Vui lòng nhập lý do hoàn tiền (tối thiểu 10 ký tự)");
            return;
        }

        setLoading(true);
        try {
            const response = await ordersAPI.requestRefund(order.id, refundReason);
            if (response.success) {
                setShowRefundModal(false);
                fetchOrder();
            } else {
                alert(response.message || "Lỗi yêu cầu hoàn tiền");
            }
        } catch (err) {
            alert(err.message || "Lỗi yêu cầu hoàn tiền"); // APIError will have message
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="text-center py-16">
                <p className="text-lg text-error mb-4">{error || "Không tìm thấy đơn hàng"}</p>
                <Link href="/account/orders" className="btn btn-primary">
                    Quay lại danh sách đơn hàng
                </Link>
            </div>
        );
    }

    const statusInfo = getOrderStatusInfo(order.status);
    const canCancel = ["PENDING_PAYMENT", "PENDING_CONFIRMATION"].includes(order.status);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/account/orders"
                    className="p-2 text-muted hover:text-foreground transition-colors"
                >
                    <ChevronLeftIcon />
                </Link>
                <div>
                    <h1 className="text-xl font-semibold text-foreground">
                        Đơn hàng #{order.orderNumber}
                    </h1>
                    <p className="text-sm text-muted">
                        Đặt ngày {formatDate(order.createdAt)}
                    </p>
                </div>
            </div>

            {/* Order Status */}
            <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">Trạng thái đơn hàng</h2>
                    <span className={`badge ${statusInfo.bgClass}`}>
                        {statusInfo.label}
                    </span>
                </div>

                {/* Countdown Timer for Pending Payment */}
                {order.status === "PENDING_PAYMENT" && order.lockedUntil && (
                    <div className="mb-4 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                        <CountdownTimer
                            deadline={order.lockedUntil}
                            label="Thời gian thanh toán còn lại"
                            onExpire={() => fetchOrder()}
                        />
                        <p className="text-sm text-warning mt-2">
                            Vui lòng hoàn tất thanh toán trước khi hết thời gian.
                        </p>
                    </div>
                )}

                {/* Status Timeline */}
                {order.statusHistory && order.statusHistory.length > 0 && (
                    <div className="space-y-4">
                        {order.statusHistory.slice(0, 5).map((history, index) => {
                            const historyStatus = getOrderStatusInfo(history.toStatus);
                            return (
                                <div key={history.id} className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${index === 0 ? "bg-accent text-white" : "bg-secondary text-muted"
                                        }`}>
                                        {history.toStatus === "CANCELLED" || history.toStatus === "REFUNDED" ? (
                                            <XCircleIcon />
                                        ) : history.toStatus === "DELIVERED" || history.toStatus === "COMPLETED" ? (
                                            <CheckCircleIcon />
                                        ) : history.toStatus.includes("TRANSIT") || history.toStatus.includes("SHIP") ? (
                                            <TruckIcon />
                                        ) : (
                                            <PackageIcon />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-foreground">{historyStatus.label}</p>
                                        <p className="text-sm text-muted">{formatDate(history.createdAt)}</p>
                                        {history.note && <p className="text-sm text-muted mt-1">{history.note}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {canCancel && (
                    <button
                        onClick={handleCancelOrder}
                        disabled={cancelling}
                        className="mt-4 btn btn-outline text-error border-error hover:bg-error hover:text-white disabled:opacity-50"
                    >
                        {cancelling ? "Đang hủy..." : "Hủy đơn hàng"}
                    </button>
                )}

                {/* Repay Button for VNPAY Pending Orders */}
                {order.status === "PENDING_PAYMENT" && order.paymentMethod === "VNPAY" && (
                    <button
                        onClick={handleRepay}
                        disabled={loading}
                        className="mt-4 ml-2 btn btn-primary"
                    >
                        Thanh toán lại
                    </button>
                )}

                {/* Confirm Received Button */}
                {order.status === "DELIVERED" && (
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={handleConfirmReceived}
                            disabled={loading}
                            className="btn btn-primary"
                        >
                            Đã nhận được hàng
                        </button>
                        <button
                            onClick={handleRequestRefund}
                            disabled={loading}
                            className="btn btn-outline text-warning border-warning hover:bg-warning hover:text-white"
                        >
                            Yêu cầu hoàn tiền
                        </button>
                    </div>
                )}

                {/* Confirm Refund Received Button */}
                {order.status === "REFUNDED" && (
                    <button
                        onClick={handleConfirmReceived}
                        disabled={loading}
                        className="mt-4 btn btn-primary"
                    >
                        Đã nhận được tiền hoàn
                    </button>
                )}
            </div>

            {/* Shipping Info */}
            <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Thông tin giao hàng</h2>
                <div className="space-y-2 text-sm">
                    <p className="font-medium text-foreground">{order.address?.fullName}</p>
                    <p className="text-muted">{order.address?.phone}</p>
                    <p className="text-muted">
                        {order.address?.streetAddress}, {order.address?.wardName}, {order.address?.provinceName}
                    </p>
                </div>
            </div>

            {/* Order Items */}
            <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                    Sản phẩm ({order.items?.length || 0})
                </h2>
                <div className="space-y-4">
                    {order.items?.map((item) => (
                        <div key={item.id} className="flex gap-4">
                            <div className="relative w-20 h-24 bg-secondary rounded-lg overflow-hidden flex-shrink-0">
                                <Image
                                    src={getImageUrl(item.variant?.product?.images?.[0]?.url)}
                                    alt={item.productName}
                                    fill
                                    className="object-cover"
                                    sizes="80px"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground">{item.productName}</p>
                                <p className="text-sm text-muted mt-1">{item.variantInfo}</p>
                                <p className="text-sm text-muted">SKU: {item.sku}</p>
                                <div className="flex items-center justify-between mt-2">
                                    <p className="text-sm text-muted">x{item.quantity}</p>
                                    <p className="font-medium text-foreground">{formatPrice(item.totalPrice)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Thanh toán</h2>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted">Tạm tính</span>
                        <span className="text-foreground">{formatPrice(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted">Phí vận chuyển</span>
                        <span className={Number(order.shippingFee) === 0 ? "text-success" : "text-foreground"}>
                            {Number(order.shippingFee) === 0 ? "Miễn phí" : formatPrice(order.shippingFee)}
                        </span>
                    </div>
                    {Number(order.discountAmount) > 0 && (
                        <div className="flex justify-between">
                            <span className="text-muted">Giảm giá</span>
                            <span className="text-success">-{formatPrice(order.discountAmount)}</span>
                        </div>
                    )}
                    {Number(order.loyaltyDiscount) > 0 && (
                        <div className="flex justify-between">
                            <span className="text-muted">Điểm thưởng</span>
                            <span className="text-success">-{formatPrice(order.loyaltyDiscount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between pt-3 border-t border-border">
                        <span className="font-semibold text-foreground">Tổng cộng</span>
                        <span className="text-xl font-bold text-accent">{formatPrice(order.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-muted">Phương thức thanh toán</span>
                        <span className="text-foreground">
                            {order.paymentMethod === "COD" ? "Thanh toán khi nhận hàng" :
                                order.paymentMethod === "VNPAY" ? "VNPAY" : "Chuyển khoản"}
                        </span>
                    </div>
                </div>
            </div>
            {/* Refund Request Modal */}
            {showRefundModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-card w-full max-w-md rounded-xl p-6 space-y-4 animate-fade-in shadow-xl border border-border">
                        <h3 className="text-xl font-semibold text-foreground">Yêu cầu hoàn tiền</h3>
                        <p className="text-sm text-muted">
                            Vui lòng cho chúng tôi biết lý do bạn muốn hoàn tiền. Yêu cầu của bạn sẽ được xem xét trong vòng 24h.
                        </p>

                        <textarea
                            value={refundReason}
                            onChange={(e) => setRefundReason(e.target.value)}
                            placeholder="Nhập lý do hoàn tiền (tối thiểu 10 ký tự)..."
                            className="w-full h-32 px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:border-accent resize-none"
                        />

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setShowRefundModal(false)}
                                className="btn btn-outline"
                                disabled={loading}
                            >
                                Đóng
                            </button>
                            <button
                                onClick={submitRefundRequest}
                                className="btn btn-primary"
                                disabled={loading || refundReason.length < 10}
                            >
                                {loading ? "Đang gửi..." : "Gửi yêu cầu"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Refund Received Modal */}
            {showConfirmRefundModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-card w-full max-w-md rounded-xl p-6 space-y-4 animate-fade-in shadow-xl border border-border">
                        <div className="text-center space-y-2">
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-foreground">Xác nhận đã nhận tiền</h3>
                            <p className="text-sm text-muted">
                                Bạn xác nhận rằng đã nhận đủ số tiền hoàn lại từ cửa hàng?
                                <br />Đơn hàng sẽ được chuyển sang trạng thái "Đã nhận tiền hoàn" và quy trình hoàn tiền sẽ kết thúc.
                            </p>
                        </div>

                        <div className="flex justify-center gap-3 pt-4">
                            <button
                                onClick={() => setShowConfirmRefundModal(false)}
                                className="btn btn-outline min-w-[100px]"
                                disabled={loading}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={submitConfirmRefund}
                                className="btn btn-primary min-w-[100px]"
                                disabled={loading}
                            >
                                {loading ? "Đang xử lý..." : "Xác nhận"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

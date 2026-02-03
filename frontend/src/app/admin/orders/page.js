"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ordersAPI } from "@/lib/api";
import { formatPrice, formatDate, getOrderStatusInfo } from "@/lib/utils";
import { useSocket, SOCKET_EVENTS } from "@/context/SocketContext";
import { useAuth } from "@/context/AuthContext";
import { canTransitionOrderStatus, ROLES } from "@/lib/permissions";

// Icons
const SearchIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);

const EyeIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.574-3.007-9.964-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const statusTabs = [
    { value: "", label: "Tất cả" },
    { value: "pending", label: "Chờ xử lý" },
    { value: "processing", label: "Đang xử lý" },
    { value: "shipping", label: "Đang giao" },
    { value: "completed", label: "Hoàn thành" },
    { value: "cancelled", label: "Đã hủy" },
];

const statusFilters = {
    pending: ["PENDING_PAYMENT", "PENDING_CONFIRMATION"],
    processing: ["PREPARING", "READY_TO_SHIP"],
    shipping: ["IN_TRANSIT", "OUT_FOR_DELIVERY"],
    completed: ["DELIVERED", "COMPLETED"],
    cancelled: ["CANCELLED", "REFUNDED"],
};

/**
 * Admin Orders Management Page
 * Trang Quản lý đơn hàng (Admin)
 * 
 * Chức năng:
 * - Hiển thị tất cả đơn hàng hệ thống
 * - Lọc đơn hàng theo trạng thái, tìm kiếm
 * - Cập nhật trạng thái đơn hàng (Xác nhận, Gửi hàng...)
 * - Tự động cập nhật real-time qua Socket.io
 */
export default function AdminOrdersPage() {
    const { user } = useAuth();
    const userRole = user?.role?.name || user?.role;

    // State management
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 15,
        total: 0,
        totalPages: 0,
    });

    // Fetch orders when filters change
    useEffect(() => {
        fetchOrders();
    }, [statusFilter, pagination.page]);

    // Real-time subscription for auto-refresh
    // Đăng ký sự kiện Socket để cập nhật đơn hàng mới/thay đổi trạng thái
    const { subscribe, unsubscribe } = useSocket();

    useEffect(() => {
        const handleOrderEvent = (data) => {
            console.log('[Admin Orders] Real-time update:', data);
            fetchOrders(); // Refresh the list
        };

        subscribe(SOCKET_EVENTS.ORDER_CREATED, handleOrderEvent);
        subscribe(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleOrderEvent);
        subscribe(SOCKET_EVENTS.ORDER_CANCELLED, handleOrderEvent);

        return () => {
            unsubscribe(SOCKET_EVENTS.ORDER_CREATED, handleOrderEvent);
            unsubscribe(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleOrderEvent);
            unsubscribe(SOCKET_EVENTS.ORDER_CANCELLED, handleOrderEvent);
        };
    }, [subscribe, unsubscribe]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.page,
                limit: pagination.limit,
            };
            if (statusFilter && statusFilters[statusFilter]) {
                params.status = statusFilters[statusFilter].join(",");
            }

            const response = await ordersAPI.getAll(params);
            if (response.success) {
                // Handle different response structures
                let orderData = Array.isArray(response.data)
                    ? response.data
                    : response.data?.data || response.data?.items || [];

                // Filter by search if needed
                if (search) {
                    const searchLower = search.toLowerCase();
                    orderData = orderData.filter((o) =>
                        o.orderNumber?.toLowerCase().includes(searchLower) ||
                        o.contactName?.toLowerCase().includes(searchLower) ||
                        o.user?.fullName?.toLowerCase().includes(searchLower)
                    );
                }

                setOrders(orderData);
                setPagination((prev) => ({
                    ...prev,
                    total: response.data?.pagination?.total || response.data?.total || orderData.length,
                    totalPages: response.data?.pagination?.totalPages || response.data?.totalPages || 1,
                }));
            }
        } catch (err) {
            console.error("Failed to fetch orders:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            await ordersAPI.updateStatus(orderId, newStatus);
            fetchOrders();
        } catch (err) {
            console.error("Failed to update status:", err);
            alert("Không thể cập nhật trạng thái đơn hàng");
        }
    };

    // Get next action based on status AND user role permissions
    const getNextAction = (status) => {
        const statusActions = {
            PENDING_CONFIRMATION: { label: "Xác nhận", nextStatus: "PREPARING" },
            PREPARING: { label: "Sẵn sàng giao", nextStatus: "READY_TO_SHIP" },
            READY_TO_SHIP: { label: "Đang vận chuyển", nextStatus: "IN_TRANSIT" },
            IN_TRANSIT: { label: "Đang giao", nextStatus: "OUT_FOR_DELIVERY" },
            OUT_FOR_DELIVERY: { label: "Đã giao", nextStatus: "DELIVERED" },
        };

        const action = statusActions[status];
        if (!action) return null;

        // Check if user has permission to perform this status transition
        if (!canTransitionOrderStatus(userRole, status, action.nextStatus)) {
            return null;
        }

        return action;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Đơn hàng</h1>
                <p className="text-muted mt-1">Quản lý và xử lý đơn hàng</p>
            </div>

            {/* Status Tabs */}
            <div className="flex flex-wrap gap-2">
                {statusTabs.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => {
                            setStatusFilter(tab.value);
                            setPagination((p) => ({ ...p, page: 1 }));
                        }}
                        className={`btn btn-sm transition-colors ${statusFilter === tab.value
                            ? "btn-primary"
                            : "btn-outline"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search & Filters */}
            <div className="bg-card rounded-xl border border-border p-4">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                        type="text"
                        placeholder="Tìm theo mã đơn, tên khách hàng..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && fetchOrders()}
                        className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:border-accent"
                    />
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-16 text-muted">
                        Không có đơn hàng nào
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-secondary/50">
                                    <th className="text-left p-4 text-sm font-medium text-muted">
                                        Mã đơn
                                    </th>
                                    <th className="text-left p-4 text-sm font-medium text-muted">
                                        Khách hàng
                                    </th>
                                    <th className="text-left p-4 text-sm font-medium text-muted">
                                        Ngày đặt
                                    </th>
                                    <th className="text-left p-4 text-sm font-medium text-muted">
                                        Tổng tiền
                                    </th>
                                    <th className="text-left p-4 text-sm font-medium text-muted">
                                        Thanh toán
                                    </th>
                                    <th className="text-left p-4 text-sm font-medium text-muted">
                                        Trạng thái
                                    </th>
                                    <th className="text-right p-4 text-sm font-medium text-muted">
                                        Thao tác
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => {
                                    const statusInfo = getOrderStatusInfo(order.status);
                                    const nextAction = getNextAction(order.status);

                                    return (
                                        <tr key={order.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                                            <td className="p-4">
                                                <span className="font-medium text-foreground">
                                                    {order.orderNumber}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div>
                                                    <p className="text-foreground">
                                                        {order.user?.fullName || order.contactName || "—"}
                                                    </p>
                                                    <p className="text-sm text-muted">
                                                        {order.user?.phone || order.contactPhone}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="p-4 text-muted">
                                                {formatDate(order.createdAt)}
                                            </td>
                                            <td className="p-4 font-medium text-foreground">
                                                {formatPrice(order.totalAmount || order.total)}
                                            </td>
                                            <td className="p-4">
                                                <span
                                                    className={`badge ${order.paymentStatus === "PAID"
                                                        ? "badge-success"
                                                        : order.paymentStatus === "FAILED"
                                                            ? "badge-error"
                                                            : "badge-warning"
                                                        }`}
                                                >
                                                    {order.paymentStatus === "PAID"
                                                        ? "Đã TT"
                                                        : order.paymentStatus === "FAILED"
                                                            ? "Thất bại"
                                                            : "Chưa TT"}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`badge ${statusInfo.bgClass}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {nextAction && (
                                                        <button
                                                            onClick={() => handleUpdateStatus(order.id, nextAction.nextStatus)}
                                                            className="btn btn-primary btn-xs"
                                                        >
                                                            {nextAction.label}
                                                        </button>
                                                    )}
                                                    <Link
                                                        href={`/admin/orders/${order.id}`}
                                                        className="p-2 text-muted hover:text-accent transition-colors"
                                                        title="Xem chi tiết"
                                                    >
                                                        <EyeIcon />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-border">
                        <p className="text-sm text-muted">
                            Hiển thị {orders.length} / {pagination.total} đơn hàng
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                                disabled={pagination.page === 1}
                                className="btn btn-outline btn-sm"
                            >
                                Trước
                            </button>
                            <span className="text-sm text-foreground">
                                {pagination.page} / {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                                disabled={pagination.page === pagination.totalPages}
                                className="btn btn-outline btn-sm"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

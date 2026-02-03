"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ordersAPI } from "@/lib/api";
import { formatPrice, formatDate, getOrderStatusInfo, getImageUrl } from "@/lib/utils";

// Icons
const ChevronRightIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);

const PackageIcon = () => (
    <svg className="w-16 h-16 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
);

/**
 * User Orders Page
 * Trang Quản lý đơn hàng cá nhân
 * 
 * Chức năng:
 * - Hiển thị danh sách đơn hàng đã đặt
 * - Lọc đơn hàng theo trạng thái (Chờ xử lý, Đang giao...)
 * - Xem chi tiết từng đơn hàng
 */
export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    // Fetch orders on mount
    // Lấy danh sách đơn hàng khi vào trang
    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const response = await ordersAPI.getMyOrders();
            if (response.success) {
                // API returns { data: { data: orders[], pagination: {} } }
                const ordersData = response.data?.data || response.data || [];
                setOrders(Array.isArray(ordersData) ? ordersData : []);
            }
        } catch (err) {
            console.error("Failed to fetch orders:", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredOrders = filter === "all"
        ? orders
        : orders.filter((order) => {
            if (filter === "pending") {
                return ["PENDING_PAYMENT", "PENDING_CONFIRMATION", "PREPARING", "READY_TO_SHIP"].includes(order.status);
            }
            if (filter === "shipping") {
                return ["IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(order.status);
            }
            if (filter === "completed") {
                return ["DELIVERED", "COMPLETED"].includes(order.status);
            }
            if (filter === "cancelled") {
                return ["CANCELLED", "REFUNDED"].includes(order.status);
            }
            return true;
        });

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
                <h2 className="text-xl font-semibold text-foreground mb-6">
                    Đơn hàng của tôi
                </h2>

                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {[
                        { value: "all", label: "Tất cả" },
                        { value: "pending", label: "Chờ xử lý" },
                        { value: "shipping", label: "Đang giao" },
                        { value: "completed", label: "Hoàn thành" },
                        { value: "cancelled", label: "Đã hủy" },
                    ].map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setFilter(tab.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === tab.value
                                ? "bg-accent text-white"
                                : "bg-secondary text-muted hover:text-foreground"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Orders List */}
                {filteredOrders.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="flex justify-center mb-4">
                            <PackageIcon />
                        </div>
                        <p className="text-lg font-medium text-foreground mb-2">
                            Chưa có đơn hàng nào
                        </p>
                        <p className="text-muted mb-6">
                            Hãy bắt đầu mua sắm để có đơn hàng đầu tiên
                        </p>
                        <Link
                            href="/products"
                            className="inline-block px-6 py-3 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover transition-colors"
                        >
                            Mua sắm ngay
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredOrders.map((order) => (
                            <OrderCard key={order.id} order={order} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function OrderCard({ order }) {
    const statusInfo = getOrderStatusInfo(order.status);

    return (
        <div className="border border-border rounded-lg overflow-hidden">
            {/* Order Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-secondary">
                <div className="flex items-center gap-4">
                    <div>
                        <p className="text-sm text-muted">Mã đơn hàng</p>
                        <p className="font-semibold text-foreground">{order.orderNumber}</p>
                    </div>
                    <div className="hidden sm:block h-8 w-px bg-border" />
                    <div className="hidden sm:block">
                        <p className="text-sm text-muted">Ngày đặt</p>
                        <p className="text-foreground">{formatDate(order.createdAt)}</p>
                    </div>
                </div>
                <span className={`badge ${statusInfo.bgClass}`}>
                    {statusInfo.label}
                </span>
            </div>

            {/* Order Items */}
            <div className="p-4 space-y-4">
                {order.items.slice(0, 2).map((item) => (
                    <div key={item.id} className="flex gap-4">
                        <div className="relative w-16 h-20 bg-secondary rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                                src={getImageUrl(item.variant?.product?.images?.[0]?.url)}
                                alt={item.variant?.product?.name || item.productName || "Product"}
                                fill
                                className="object-cover"
                                sizes="64px"
                                unoptimized
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground line-clamp-1">
                                {item.variant?.product?.name || item.productName}
                            </p>
                            <p className="text-sm text-muted mt-1">
                                {item.variant?.size && item.variant?.color
                                    ? `${item.variant.size} / ${item.variant.color}`
                                    : item.variantInfo}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                                <p className="text-sm text-muted">x{item.quantity}</p>
                                <p className="font-medium text-foreground">
                                    {formatPrice(item.totalPrice || (item.unitPrice * item.quantity))}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}

                {order.items.length > 2 && (
                    <p className="text-sm text-muted text-center">
                        +{order.items.length - 2} sản phẩm khác
                    </p>
                )}
            </div>

            {/* Order Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border">
                <div>
                    <span className="text-sm text-muted">Tổng tiền: </span>
                    <span className="text-lg font-bold text-accent">{formatPrice(order.totalAmount)}</span>
                </div>
                <Link
                    href={`/account/orders/${order.orderNumber}`}
                    className="flex items-center gap-1 text-accent hover:text-accent-hover font-medium text-sm transition-colors"
                >
                    Chi tiết
                    <ChevronRightIcon />
                </Link>
            </div>
        </div>
    );
}

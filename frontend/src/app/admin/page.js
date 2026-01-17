"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ordersAPI, productsAPI } from "@/lib/api";
import { formatPrice, formatDate, getOrderStatusInfo } from "@/lib/utils";

// Statistics Icons
const RevenueIcon = () => (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const OrderIcon = () => (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);

const CustomerIcon = () => (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
);

const ProductIcon = () => (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        pendingOrders: 0,
        totalCustomers: 0,
        lowStockProducts: 0,
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Fetch orders for statistics
            const ordersRes = await ordersAPI.getAll({ limit: 10 });
            if (ordersRes.success) {
                // API returns { data: { data: [...], pagination: {...} } }
                const orders = Array.isArray(ordersRes.data)
                    ? ordersRes.data
                    : ordersRes.data?.data || ordersRes.data?.items || [];
                setRecentOrders(orders.slice(0, 5));

                // Calculate stats from orders
                const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount || o.total || 0), 0);
                const pendingOrders = orders.filter(o =>
                    ["PENDING_PAYMENT", "PENDING_CONFIRMATION", "PREPARING", "READY_TO_SHIP"].includes(o.status)
                ).length;

                setStats(prev => ({
                    ...prev,
                    totalRevenue,
                    totalOrders: ordersRes.data?.pagination?.total || orders.length,
                    pendingOrders,
                }));
            }

            // Fetch low stock products
            const productsRes = await productsAPI.getAll({ lowStock: true, limit: 5 });
            if (productsRes.success) {
                const products = productsRes.data?.items || productsRes.data || [];
                setStats(prev => ({
                    ...prev,
                    lowStockProducts: products.length,
                }));
            }
        } catch (err) {
            console.error("Failed to fetch dashboard data:", err);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            label: "Doanh thu",
            value: formatPrice(stats.totalRevenue),
            icon: RevenueIcon,
            color: "bg-green-500",
            link: "/admin/orders",
        },
        {
            label: "Đơn hàng",
            value: stats.totalOrders,
            subValue: `${stats.pendingOrders} chờ xử lý`,
            icon: OrderIcon,
            color: "bg-blue-500",
            link: "/admin/orders",
        },
        {
            label: "Khách hàng",
            value: stats.totalCustomers || "—",
            icon: CustomerIcon,
            color: "bg-purple-500",
            link: "/admin/users",
        },
        {
            label: "Sắp hết hàng",
            value: stats.lowStockProducts,
            subValue: "sản phẩm",
            icon: ProductIcon,
            color: "bg-orange-500",
            link: "/admin/products?lowStock=true",
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                <p className="text-muted mt-1">Tổng quan hoạt động kinh doanh</p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card, index) => (
                    <Link
                        key={index}
                        href={card.link}
                        className="bg-card rounded-xl border border-border p-6 hover:border-accent transition-colors group"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-muted mb-1">{card.label}</p>
                                <p className="text-2xl font-bold text-foreground">{card.value}</p>
                                {card.subValue && (
                                    <p className="text-sm text-muted mt-1">{card.subValue}</p>
                                )}
                            </div>
                            <div className={`p-3 ${card.color} rounded-lg text-white`}>
                                <card.icon />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Recent Orders */}
            <div className="bg-card rounded-xl border border-border">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">
                        Đơn hàng gần đây
                    </h2>
                    <Link
                        href="/admin/orders"
                        className="flex items-center gap-1 text-sm text-accent hover:text-accent-hover transition-colors"
                    >
                        Xem tất cả
                        <ChevronRightIcon />
                    </Link>
                </div>

                {recentOrders.length === 0 ? (
                    <div className="p-8 text-center text-muted">
                        Chưa có đơn hàng nào
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border">
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
                                        Trạng thái
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.map((order) => {
                                    const statusInfo = getOrderStatusInfo(order.status);
                                    return (
                                        <tr
                                            key={order.id}
                                            className="border-b border-border last:border-0 hover:bg-secondary/50"
                                        >
                                            <td className="p-4">
                                                <Link
                                                    href={`/admin/orders/${order.id}`}
                                                    className="font-medium text-foreground hover:text-accent"
                                                >
                                                    {order.orderNumber}
                                                </Link>
                                            </td>
                                            <td className="p-4 text-foreground">
                                                {order.user?.fullName || order.contactName || "—"}
                                            </td>
                                            <td className="p-4 text-muted">
                                                {formatDate(order.createdAt)}
                                            </td>
                                            <td className="p-4 font-medium text-foreground">
                                                {formatPrice(order.totalAmount || order.total)}
                                            </td>
                                            <td className="p-4">
                                                <span className={`badge ${statusInfo.bgClass}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                    href="/admin/products/new"
                    className="flex items-center gap-4 p-6 bg-card rounded-xl border border-border hover:border-accent transition-colors"
                >
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </div>
                    <div>
                        <p className="font-semibold text-foreground">Thêm sản phẩm</p>
                        <p className="text-sm text-muted">Tạo sản phẩm mới</p>
                    </div>
                </Link>

                <Link
                    href="/admin/orders?status=pending"
                    className="flex items-center gap-4 p-6 bg-card rounded-xl border border-border hover:border-accent transition-colors"
                >
                    <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <p className="font-semibold text-foreground">Đơn chờ xử lý</p>
                        <p className="text-sm text-muted">{stats.pendingOrders} đơn hàng</p>
                    </div>
                </Link>

                <Link
                    href="/admin/products?lowStock=true"
                    className="flex items-center gap-4 p-6 bg-card rounded-xl border border-border hover:border-accent transition-colors"
                >
                    <div className="w-12 h-12 bg-error/10 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </div>
                    <div>
                        <p className="font-semibold text-foreground">Cảnh báo tồn kho</p>
                        <p className="text-sm text-muted">{stats.lowStockProducts} sản phẩm</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}

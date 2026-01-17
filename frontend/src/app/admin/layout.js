"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSocket, SOCKET_EVENTS } from "@/context/SocketContext";
import { getNavItemsByRole, isAdminRole } from "@/lib/permissions";

// Icons
const DashboardIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
    </svg>
);

const ProductIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
);

const OrderIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
);

const CategoryIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z" />
    </svg>
);

const BrandIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 6h.008v.008H6V6z" />
    </svg>
);

const UserIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
);



const LogoutIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
);

const MenuIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

const BellIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
);

const navItems = [
    { href: "/admin", label: "Dashboard", icon: DashboardIcon },
    { href: "/admin/products", label: "Sản phẩm", icon: ProductIcon },
    { href: "/admin/orders", label: "Đơn hàng", icon: OrderIcon },
    { href: "/admin/categories", label: "Danh mục", icon: CategoryIcon },
    { href: "/admin/brands", label: "Thương hiệu", icon: BrandIcon },
    { href: "/admin/users", label: "Khách hàng", icon: UserIcon },

];

export default function AdminLayout({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, isAuthenticated, logout, loading } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    // Real-time notifications
    const { notifications, unreadCount, markAsRead, subscribe, unsubscribe } = useSocket();
    const [newOrderAlert, setNewOrderAlert] = useState(null);

    // Listen for new orders specifically
    useEffect(() => {
        const handleNewOrder = (data) => {
            setNewOrderAlert(data);
            // Auto-clear after 5 seconds
            setTimeout(() => setNewOrderAlert(null), 5000);
        };

        subscribe(SOCKET_EVENTS.ORDER_CREATED, handleNewOrder);
        return () => unsubscribe(SOCKET_EVENTS.ORDER_CREATED, handleNewOrder);
    }, [subscribe, unsubscribe]);

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/admin/login");
        }
    }, [loading, isAuthenticated, router]);

    useEffect(() => {
        if (!loading && user) {
            const roleName = user.role?.name || user.role;
            const ADMIN_ROLES = ["ADMIN", "SALES_STAFF", "SALES_MANAGER", "WAREHOUSE"];
            if (!ADMIN_ROLES.includes(roleName)) {
                router.push("/");
            }
        }
    }, [loading, user, router]);

    const handleLogout = () => {
        logout();
        router.push("/admin/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Allow access to login page without authentication check blocking
    if (pathname === "/admin/login") {
        return <div className="min-h-screen bg-background">{children}</div>;
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-secondary">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full w-64 bg-primary text-white z-50 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                {/* Logo */}
                <div className="h-16 flex items-center justify-center border-b border-white/10">
                    <Link href="/admin" className="text-xl font-bold text-accent">
                        Admin Panel
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 overflow-y-auto">
                    {getNavItemsByRole(user?.role?.name || user?.role, navItems).map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors ${isActive
                                    ? "bg-accent text-white"
                                    : "text-white/70 hover:bg-white/10 hover:text-white"
                                    }`}
                            >
                                <item.icon />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Info & Logout */}
                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                            <span className="text-lg font-bold">
                                {user?.fullName?.charAt(0) || "A"}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {user?.fullName || "Admin"}
                            </p>
                            <p className="text-xs text-white/60 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <LogoutIcon />
                        <span>Đăng xuất</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="lg:pl-64">
                {/* Header */}
                <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sticky top-0 z-30">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden p-2 text-foreground hover:bg-secondary rounded-lg"
                    >
                        <MenuIcon />
                    </button>
                    <div className="flex-1 lg:flex-none">
                        <h1 className="text-lg font-semibold text-foreground lg:hidden">
                            Admin Panel
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Notification Bell */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2 text-muted hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                            >
                                <BellIcon />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white text-xs font-bold rounded-full flex items-center justify-center">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {showNotifications && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowNotifications(false)}
                                    />
                                    <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto">
                                        <div className="p-3 border-b border-border flex items-center justify-between">
                                            <span className="font-medium text-foreground">Thông báo</span>
                                            {unreadCount > 0 && (
                                                <span className="text-xs text-muted">{unreadCount} chưa đọc</span>
                                            )}
                                        </div>
                                        {notifications.length === 0 ? (
                                            <div className="p-4 text-center text-muted text-sm">
                                                Không có thông báo
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-border">
                                                {notifications.slice(0, 10).map((n) => (
                                                    <div
                                                        key={n.id}
                                                        onClick={() => {
                                                            markAsRead(n.id);
                                                            if (n.data?.orderId) {
                                                                router.push(`/admin/orders/${n.data.orderId}`);
                                                                setShowNotifications(false);
                                                            }
                                                        }}
                                                        className={`p-3 cursor-pointer hover:bg-secondary transition-colors ${!n.read ? 'bg-accent/5' : ''}`}
                                                    >
                                                        <p className="text-sm font-medium text-foreground">{n.title}</p>
                                                        <p className="text-xs text-muted mt-1">{n.message}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <Link
                            href="/"
                            target="_blank"
                            className="text-sm text-muted hover:text-accent transition-colors"
                        >
                            Xem trang chủ
                        </Link>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-4 lg:p-6">{children}</main>
            </div>
        </div>
    );
}

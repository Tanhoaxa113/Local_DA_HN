"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usersAPI } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { hasPageAccess } from "@/lib/permissions";

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

const CloseIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const tierColors = {
    STANDARD: "text-muted",
    SILVER: "text-gray-400",
    GOLD: "text-yellow-500",
    DIAMOND: "text-cyan-400",
};

export default function AdminUsersPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const userRole = user?.role?.name || user?.role;

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 15,
        total: 0,
        totalPages: 0,
    });

    // Redirect users without access
    useEffect(() => {
        if (!authLoading && !hasPageAccess(userRole, "users")) {
            router.push("/admin");
        }
    }, [authLoading, userRole, router]);

    useEffect(() => {
        if (hasPageAccess(userRole, "users")) {
            fetchUsers();
        }
    }, [roleFilter, pagination.page, userRole]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                role: roleFilter || undefined,
            };
            const response = await usersAPI.getAll(params);
            if (response.success) {
                // Handle different response structures
                const usersData = Array.isArray(response.data)
                    ? response.data
                    : response.data?.data || response.data?.items || [];

                setUsers(usersData);

                setPagination((prev) => ({
                    ...prev,
                    total: response.data?.pagination?.total || response.data?.total || 0,
                    totalPages: response.data?.pagination?.totalPages || response.data?.totalPages || 1,
                }));
            }
        } catch (err) {
            console.error("Failed to fetch users:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        if (!search.trim()) {
            fetchUsers();
            return;
        }
        const searchLower = search.toLowerCase();
        const filtered = users.filter(
            (u) =>
                u.fullName?.toLowerCase().includes(searchLower) ||
                u.email?.toLowerCase().includes(searchLower) ||
                u.phone?.includes(search)
        );
        setUsers(filtered);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Khách hàng</h1>
                <p className="text-muted mt-1">Quản lý thông tin khách hàng</p>
            </div>

            {/* Filters */}
            <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            placeholder="Tìm theo tên, email, SĐT..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:border-accent"
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
                    >
                        <option value="">Tất cả vai trò</option>
                        <option value="CUSTOMER">Khách hàng</option>
                        <option value="STAFF">Nhân viên</option>
                        <option value="ADMIN">Quản trị viên</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center py-16 text-muted">
                        Không tìm thấy người dùng nào
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-secondary/50">
                                    <th className="text-left p-4 text-sm font-medium text-muted">Khách hàng</th>
                                    <th className="text-left p-4 text-sm font-medium text-muted">Liên hệ</th>
                                    <th className="text-left p-4 text-sm font-medium text-muted">Vai trò</th>
                                    <th className="text-left p-4 text-sm font-medium text-muted">Điểm thưởng</th>
                                    <th className="text-left p-4 text-sm font-medium text-muted">Hạng</th>
                                    <th className="text-left p-4 text-sm font-medium text-muted">Ngày đăng ký</th>
                                    <th className="text-right p-4 text-sm font-medium text-muted">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                                                    <span className="font-semibold text-accent">
                                                        {user.fullName?.charAt(0) || "U"}
                                                    </span>
                                                </div>
                                                <span className="font-medium text-foreground">{user.fullName || "—"}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-foreground">{user.email}</p>
                                            <p className="text-sm text-muted">{user.phone || "—"}</p>
                                        </td>
                                        <td className="p-4">
                                            <span
                                                className={`badge ${(user.role?.name || user.role) === "ADMIN"
                                                    ? "badge-error"
                                                    : (user.role?.name || user.role) === "STAFF"
                                                        ? "badge-warning"
                                                        : "badge-accent"
                                                    }`}
                                            >
                                                {(user.role?.name || user.role) === "ADMIN"
                                                    ? "Admin"
                                                    : (user.role?.name || user.role) === "STAFF"
                                                        ? "Nhân viên"
                                                        : "Khách hàng"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-foreground font-medium">
                                            {user.loyaltyPoints || 0}
                                        </td>
                                        <td className="p-4">
                                            <span className={`font-medium ${tierColors[user.memberTier?.name] || "text-muted"}`}>
                                                {user.memberTier?.name || "Thường"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-muted">
                                            {formatDate(user.createdAt)}
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => setSelectedUser(user)}
                                                className="p-2 text-muted hover:text-accent transition-colors"
                                                title="Xem chi tiết"
                                            >
                                                <EyeIcon />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-border">
                        <p className="text-sm text-muted">
                            Hiển thị {users.length} / {pagination.total}
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

            {/* User Detail Modal */}
            {selectedUser && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setSelectedUser(null)} />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-xl z-50 overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h3 className="text-lg font-semibold text-foreground">Chi tiết khách hàng</h3>
                            <button onClick={() => setSelectedUser(null)} className="btn btn-ghost btn-circle btn-sm">
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center">
                                    <span className="text-2xl font-bold text-accent">
                                        {selectedUser.fullName?.charAt(0) || "U"}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="text-xl font-semibold text-foreground">{selectedUser.fullName || "—"}</h4>
                                    <p className="text-muted">{selectedUser.email}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <div className="p-3 bg-secondary/50 rounded-lg">
                                    <p className="text-sm text-muted">Số điện thoại</p>
                                    <p className="font-medium text-foreground">{selectedUser.phone || "—"}</p>
                                </div>
                                <div className="p-3 bg-secondary/50 rounded-lg">
                                    <p className="text-sm text-muted">Vai trò</p>
                                    <p className="font-medium text-foreground">
                                        {(selectedUser.role?.name || selectedUser.role) === "ADMIN"
                                            ? "Quản trị viên"
                                            : (selectedUser.role?.name || selectedUser.role) === "STAFF"
                                                ? "Nhân viên"
                                                : "Khách hàng"}
                                    </p>
                                </div>
                                <div className="p-3 bg-secondary/50 rounded-lg">
                                    <p className="text-sm text-muted">Điểm tích lũy</p>
                                    <p className="font-medium text-accent">{selectedUser.loyaltyPoints || 0}</p>
                                </div>
                                <div className="p-3 bg-secondary/50 rounded-lg">
                                    <p className="text-sm text-muted">Hạng thành viên</p>
                                    <p className={`font-medium ${tierColors[selectedUser.memberTier?.name] || "text-muted"}`}>
                                        {selectedUser.memberTier?.name || "Thường"}
                                    </p>
                                </div>
                                <div className="p-3 bg-secondary/50 rounded-lg">
                                    <p className="text-sm text-muted">Ngày đăng ký</p>
                                    <p className="font-medium text-foreground">{formatDate(selectedUser.createdAt)}</p>
                                </div>
                                <div className="p-3 bg-secondary/50 rounded-lg">
                                    <p className="text-sm text-muted">Trạng thái</p>
                                    <p className="font-medium text-success">Hoạt động</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

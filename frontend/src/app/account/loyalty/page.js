"use client";

import { useState, useEffect } from "react";
import { loyaltyAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatDate, formatPrice } from "@/lib/utils";

// Icons
const GiftIcon = () => (
    <svg className="w-16 h-16 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
);

const StarIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
);

// Loyalty tiers configuration (localized names)
const tierNameMap = {
    "BRONZE": "Thường",
    "SILVER": "Bạc",
    "GOLD": "Vàng",
    "PLATINUM": "Bạch Kim",
    "DIAMOND": "Kim Cương",
};

const tierColorMap = {
    "BRONZE": "text-muted",
    "SILVER": "text-gray-400",
    "GOLD": "text-yellow-500",
    "PLATINUM": "text-purple-400",
    "DIAMOND": "text-cyan-400",
};

const tiers = [
    { id: 1, name: "Thường", minPoints: 0, discountPercent: 0, color: "text-muted" },
    { id: 2, name: "Bạc", minPoints: 1000, discountPercent: 3, color: "text-gray-400" },
    { id: 3, name: "Vàng", minPoints: 5000, discountPercent: 5, color: "text-yellow-500" },
    { id: 4, name: "Kim Cương", minPoints: 15000, discountPercent: 10, color: "text-cyan-400" },
];

export default function LoyaltyPage() {
    const { user } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const currentPoints = user?.loyaltyPoints || 0;

    // Use tier from API if available, otherwise fallback to local calculation
    const apiTier = user?.tier;
    const currentTier = apiTier ? {
        id: apiTier.id,
        name: tierNameMap[apiTier.name] || apiTier.name,
        discountPercent: Number(apiTier.discountPercent) || 0,
        minPoints: apiTier.minPoints || 0,
        color: tierColorMap[apiTier.name] || "text-muted",
    } : tiers.find(t => currentPoints >= t.minPoints) || tiers[0];

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const response = await loyaltyAPI.getHistory();
            if (response.success) {
                // API returns { data: { data: [...], pagination: {...} } }
                const historyData = response.data?.data || response.data || [];
                setHistory(Array.isArray(historyData) ? historyData : []);
            }
        } catch (err) {
            console.error("Failed to fetch history:", err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate progress to next tier
    const currentTierIndex = tiers.findIndex((t) => t.id === (currentTier?.id || 1));
    const nextTier = tiers[currentTierIndex + 1];
    const pointsToNextTier = nextTier ? nextTier.minPoints - currentPoints : 0;
    const progressPercent = nextTier
        ? Math.min(100, ((currentPoints - tiers[currentTierIndex].minPoints) / (nextTier.minPoints - tiers[currentTierIndex].minPoints)) * 100)
        : 100;

    return (
        <div className="space-y-6">
            {/* Points Overview */}
            <div className="bg-gradient-to-br from-accent/10 via-accent/5 to-transparent rounded-xl border border-accent/20 p-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="flex-shrink-0">
                        <GiftIcon />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                        <p className="text-muted text-sm mb-1">Tổng điểm tích lũy</p>
                        <p className="text-4xl font-bold text-accent">{currentPoints}</p>
                        <p className="text-sm text-muted mt-1">
                            điểm = {formatPrice(currentPoints * 1000)} giá trị quy đổi
                        </p>
                    </div>
                    <div className="text-center sm:text-right">
                        <p className="text-sm text-muted mb-1">Hạng thành viên</p>
                        <div className="flex items-center gap-2 justify-center sm:justify-end">
                            <StarIcon className={currentTier?.color || tiers[0].color} />
                            <span className={`text-xl font-bold ${currentTier?.color || tiers[0].color}`}>
                                {currentTier?.name || "Thường"}
                            </span>
                        </div>
                        {currentTier?.discountPercent > 0 && (
                            <p className="text-sm text-success mt-1">
                                Giảm {currentTier.discountPercent}% mỗi đơn hàng
                            </p>
                        )}
                    </div>
                </div>

                {/* Progress to next tier */}
                {nextTier && (
                    <div className="mt-6">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-muted">Tiến độ lên hạng {nextTier.name}</span>
                            <span className="text-foreground font-medium">
                                {currentPoints} / {nextTier.minPoints}
                            </span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-accent rounded-full transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <p className="text-sm text-muted mt-2">
                            Còn <span className="font-medium text-accent">{pointsToNextTier}</span> điểm nữa để lên hạng {nextTier.name}
                        </p>
                    </div>
                )}
            </div>

            {/* Tier Benefits */}
            <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">
                    Quyền lợi thành viên
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {tiers.map((tier) => (
                        <div
                            key={tier.id}
                            className={`p-4 rounded-lg border ${tier.id === (currentTier?.id || 1)
                                ? "border-accent bg-accent/5"
                                : "border-border"
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <StarIcon className={tier.color} />
                                <span className={`font-semibold ${tier.color}`}>{tier.name}</span>
                            </div>
                            <p className="text-sm text-muted">Từ {tier.minPoints} điểm</p>
                            <p className="text-sm font-medium text-foreground mt-1">
                                Giảm {tier.discountPercent}% mỗi đơn
                            </p>
                            {tier.id === (currentTier?.id || 1) && (
                                <span className="inline-block mt-2 text-xs text-accent font-medium">
                                    Hạng hiện tại
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* How to earn points */}
            <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                    Cách tích điểm
                </h2>
                <ul className="space-y-3 text-muted">
                    <li className="flex items-start gap-3">
                        <span className="w-6 h-6 bg-accent/10 text-accent rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                            1
                        </span>
                        <span>Mỗi 10.000₫ chi tiêu = 1 điểm thưởng</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="w-6 h-6 bg-accent/10 text-accent rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                            2
                        </span>
                        <span>Điểm được cộng sau khi đơn hàng hoàn thành</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="w-6 h-6 bg-accent/10 text-accent rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                            3
                        </span>
                        <span>Điểm có hiệu lực trong 12 tháng kể từ ngày tích</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="w-6 h-6 bg-accent/10 text-accent rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                            4
                        </span>
                        <span>Hạng thành viên được đánh giá lại mỗi năm</span>
                    </li>
                </ul>
            </div>

            {/* History */}
            <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">
                    Lịch sử điểm thưởng
                </h2>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : history.length === 0 ? (
                    <p className="text-center text-muted py-8">
                        Chưa có lịch sử điểm thưởng
                    </p>
                ) : (
                    <div className="space-y-3">
                        {history.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between py-3 border-b border-border last:border-0"
                            >
                                <div>
                                    <p className="font-medium text-foreground">{item.description}</p>
                                    <p className="text-sm text-muted">{formatDate(item.date)}</p>
                                </div>
                                <span
                                    className={`font-bold ${item.points > 0 ? "text-success" : "text-error"
                                        }`}
                                >
                                    {item.points > 0 ? "+" : ""}
                                    {item.points}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

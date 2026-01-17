"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// Icons
const CheckCircleIcon = () => (
    <svg className="w-20 h-20 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const XCircleIcon = () => (
    <svg className="w-20 h-20 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ClockIcon = () => (
    <svg className="w-20 h-20 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export default function PaymentResultPage() {
    const searchParams = useSearchParams();
    const [result, setResult] = useState({
        success: null,
        orderId: "",
        orderNumber: "",
        message: "",
    });

    useEffect(() => {
        const success = searchParams.get("success") === "true";
        const orderId = searchParams.get("orderId") || "";
        const orderNumber = searchParams.get("orderNumber") || "";
        const message = searchParams.get("message") || "";

        setResult({ success, orderId, orderNumber, message });
    }, [searchParams]);

    if (result.success === null) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center py-16 px-4">
            <div className="bg-card rounded-2xl border border-border p-8 max-w-md w-full text-center">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                    {result.success ? (
                        <CheckCircleIcon />
                    ) : result.message?.includes("hủy") ? (
                        <ClockIcon />
                    ) : (
                        <XCircleIcon />
                    )}
                </div>

                {/* Title */}
                <h1 className={`text-2xl font-bold mb-2 ${result.success ? "text-success" : "text-error"
                    }`}>
                    {result.success ? "Thanh toán thành công!" : "Thanh toán thất bại"}
                </h1>

                {/* Message */}
                <p className="text-muted mb-6">
                    {result.message || (result.success
                        ? "Đơn hàng của bạn đã được xác nhận và đang được xử lý."
                        : "Đã có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại."
                    )}
                </p>

                {/* Order Number */}
                {result.orderNumber && (
                    <div className="bg-secondary rounded-lg p-4 mb-6">
                        <p className="text-sm text-muted mb-1">Mã đơn hàng</p>
                        <p className="text-lg font-bold text-foreground">{result.orderNumber}</p>
                    </div>
                )}

                {/* Actions */}
                <div className="space-y-3">
                    {result.success ? (
                        <>
                            <Link
                                href={`/account/orders/${result.orderNumber}`}
                                className="btn btn-primary w-full block"
                            >
                                Xem chi tiết đơn hàng
                            </Link>
                            <Link
                                href="/products"
                                className="btn btn-outline w-full block"
                            >
                                Tiếp tục mua sắm
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/cart"
                                className="btn btn-primary w-full block"
                            >
                                Quay lại giỏ hàng
                            </Link>
                            <Link
                                href="/"
                                className="btn btn-outline w-full block"
                            >
                                Về trang chủ
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

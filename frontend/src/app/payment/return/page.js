"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { paymentAPI } from "@/lib/api";

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

/**
 * Payment Return Page (VNPAY Callback)
 * Trang Xử lý kết quả trả về từ VNPAY
 * 
 * Chức năng:
 * - Nhận các tham số từ VNPAY redirect về
 * - Gọi API verifyVNPay để xác thực giao dịch phía backend
 * - Hiển thị trạng thái loading trong lúc xác thực
 * - Hiển thị kết quả giao dịch (Thành công/Thất bại) và lý do chi tiết
 */
function PaymentReturnContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState({
        success: null,
        orderId: "",
        orderNumber: "",
        message: "",
    });

    // Verify payment on mount
    // Xác thực giao dịch ngay khi trang được load
    useEffect(() => {
        const verifyPayment = async () => {
            // Get all VNPAY params from URL
            // Lấy tất cả tham số VNPAY trả về từ URL
            const vnpParams = {};
            searchParams.forEach((value, key) => {
                vnpParams[key] = value;
            });

            // Helper to strip suffix
            const cleanOrderNumber = (ref) => {
                if (!ref) return "";
                if (typeof ref === 'string' && ref.includes('_')) {
                    return ref.split('_')[0];
                }
                return ref;
            };

            // If we have vnp_ResponseCode, verify with backend
            // Nếu có mã phản hồi từ VNPAY, tiến hành xác thực với backend
            if (vnpParams.vnp_ResponseCode) {
                try {
                    const response = await paymentAPI.verifyVNPay(vnpParams);
                    if (response.success) {
                        setResult({
                            success: response.data?.success || vnpParams.vnp_ResponseCode === "00",
                            orderId: response.data?.orderId || "",
                            orderNumber: cleanOrderNumber(response.data?.orderNumber || vnpParams.vnp_TxnRef),
                            message: response.data?.message || getVNPayMessage(vnpParams.vnp_ResponseCode),
                        });
                    } else {
                        // If API call "failed" (e.g. was a redirect), we fall back to params
                        // Nếu gọi API thất bại, hiển thị lỗi dựa trên tham số URL
                        setResult({
                            success: vnpParams.vnp_ResponseCode === "00",
                            orderNumber: cleanOrderNumber(vnpParams.vnp_TxnRef),
                            message: getVNPayMessage(vnpParams.vnp_ResponseCode),
                        });
                    }
                } catch (error) {
                    // Fallback to local parsing
                    setResult({
                        success: vnpParams.vnp_ResponseCode === "00",
                        orderNumber: cleanOrderNumber(vnpParams.vnp_TxnRef),
                        message: getVNPayMessage(vnpParams.vnp_ResponseCode),
                    });
                }
            } else {
                // No VNPAY params, maybe direct access
                setResult({
                    success: false,
                    message: "Không có thông tin thanh toán",
                });
            }
            setLoading(false);
        };

        verifyPayment();
    }, [searchParams]);

    const getVNPayMessage = (code) => {
        const messages = {
            "00": "Giao dịch thành công",
            "07": "Trừ tiền thành công. Giao dịch bị nghi ngờ.",
            "09": "Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking.",
            "10": "Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần",
            "11": "Đã hết hạn chờ thanh toán.",
            "12": "Thẻ/Tài khoản bị khóa.",
            "13": "Sai mật khẩu xác thực giao dịch (OTP).",
            "24": "Khách hàng hủy giao dịch",
            "51": "Tài khoản không đủ số dư để thực hiện giao dịch.",
            "65": "Tài khoản đã vượt quá hạn mức giao dịch trong ngày.",
            "75": "Ngân hàng thanh toán đang bảo trì.",
            "79": "Sai mật khẩu thanh toán quá số lần quy định.",
            "99": "Lỗi không xác định",
        };
        return messages[code] || "Lỗi không xác định";
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-muted">Đang xác nhận thanh toán...</p>
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

export default function PaymentReturnPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[60vh] flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-muted">Đang xác nhận thanh toán...</p>
            </div>
        }>
            <PaymentReturnContent />
        </Suspense>
    );
}

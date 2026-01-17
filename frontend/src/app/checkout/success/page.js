"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const CheckIcon = () => (
    <svg className="w-16 h-16 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

function SuccessContent() {
    const searchParams = useSearchParams();
    const orderNumber = searchParams.get("orderNumber");

    return (
        <div className="min-h-[70vh] flex items-center justify-center py-16 px-4">
            <div className="max-w-md text-center">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center animate-fade-in">
                        <CheckIcon />
                    </div>
                </div>

                <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
                    Đặt hàng thành công!
                </h1>

                <p className="text-muted mb-2">
                    Cảm ơn bạn đã đặt hàng tại Clothing Shop.
                </p>

                {orderNumber && (
                    <p className="text-foreground mb-6">
                        Mã đơn hàng của bạn là:{" "}
                        <span className="font-bold text-accent">{orderNumber}</span>
                    </p>
                )}

                <p className="text-sm text-muted mb-8">
                    Chúng tôi đã gửi email xác nhận đơn hàng đến địa chỉ email của bạn.
                    Bạn có thể theo dõi tình trạng đơn hàng trong tài khoản cá nhân.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {orderNumber && (
                        <Link
                            href={`/account/orders/${orderNumber}`}
                            className="px-6 py-3 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover transition-colors"
                        >
                            Xem đơn hàng
                        </Link>
                    )}
                    <Link
                        href="/products"
                        className="px-6 py-3 border border-border text-foreground font-medium rounded-lg hover:bg-secondary transition-colors"
                    >
                        Tiếp tục mua sắm
                    </Link>
                </div>

                {/* Order Summary */}
                <div className="mt-12 p-6 bg-secondary rounded-xl text-left">
                    <h3 className="font-semibold text-foreground mb-4">Bước tiếp theo</h3>
                    <ul className="space-y-3 text-sm text-muted">
                        <li className="flex items-start gap-3">
                            <span className="w-6 h-6 bg-accent/10 text-accent rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                                1
                            </span>
                            <span>Chúng tôi sẽ xác nhận đơn hàng trong vòng 24 giờ</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="w-6 h-6 bg-accent/10 text-accent rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                                2
                            </span>
                            <span>Đơn hàng sẽ được đóng gói và giao cho đơn vị vận chuyển</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="w-6 h-6 bg-accent/10 text-accent rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                                3
                            </span>
                            <span>Bạn sẽ nhận được hàng trong 3-5 ngày làm việc</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[70vh] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <SuccessContent />
        </Suspense>
    );
}

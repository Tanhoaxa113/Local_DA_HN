"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SHOP_INFO } from "@/lib/constants";

// Social Media Icons
// Các Icon mạng xã hội
const FacebookIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
    </svg>
);

const InstagramIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
);

const YoutubeIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
    </svg>
);

const TiktokIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
);


// Footer Links Configuration
// Cấu hình các liên kết Footer
const footerLinks = {
    shop: {
        title: "Cửa hàng",
        links: [
            { name: "Sản phẩm mới", href: "/products?sort=newest" },
            { name: "Bán chạy", href: "/products?sort=bestselling" },
            { name: "Khuyến mãi", href: "/products?onSale=true" },
            { name: "Thương hiệu", href: "/brands" },
        ],
    },
    categories: {
        title: "Danh mục",
        links: [
            { name: "Áo", href: "/products?category=ao" },
            { name: "Quần", href: "/products?category=quan" },
            { name: "Váy - Đầm", href: "/products?category=vay-dam" },
            { name: "Phụ kiện", href: "/products?category=phu-kien" },
        ],
    },
    support: {
        title: "Hỗ trợ",
        links: [
            { name: "Hướng dẫn mua hàng" },
            { name: "Chính sách đổi trả" },
            { name: "Chính sách vận chuyển" },
            { name: "Câu hỏi thường gặp" },
        ],
    },
    company: {
        title: "Về chúng tôi",
        links: [
            { name: "Giới thiệu" },
            { name: "Liên hệ" },
            { name: "Tuyển dụng" },
            { name: "Điều khoản sử dụng" },
        ],
    },
};

const socialLinks = [
    { name: "Facebook", href: SHOP_INFO.social.facebook, icon: FacebookIcon },
    { name: "Instagram", href: SHOP_INFO.social.instagram, icon: InstagramIcon },
    { name: "Youtube", href: SHOP_INFO.social.youtube, icon: YoutubeIcon },
    { name: "Tiktok", href: SHOP_INFO.social.tiktok, icon: TiktokIcon },
];

export default function Footer() {
    const pathname = usePathname();
    const currentYear = new Date().getFullYear();

    // Hide footer on admin pages
    // Ẩn Footer trên trang Admin
    if (pathname?.startsWith("/admin")) return null;

    return (
        <footer className="bg-[#1a1a1a] text-white">


            {/* Main Footer */}
            <div className="container py-12 lg:py-16">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                    {/* Brand Info */}
                    <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-8 lg:mb-0">
                        <Link href="/" className="inline-block text-2xl font-bold mb-4">
                            <span className="text-accent">{SHOP_INFO.brandName1}</span>
                            <span className="text-white ml-1">{SHOP_INFO.brandName2}</span>
                        </Link>
                        <p className="text-white/70 text-sm leading-relaxed mb-6">
                            {SHOP_INFO.tagline}
                        </p>

                        {/* Social Links */}
                        <div className="flex items-center space-x-4">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.name}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-accent transition-colors"
                                    aria-label={social.name}
                                >
                                    <social.icon />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Footer Links */}
                    {Object.values(footerLinks).map((section) => (
                        <div key={section.title}>
                            <h4 className="font-semibold text-white mb-4">{section.title}</h4>
                            <ul className="space-y-3">
                                {section.links.map((link) => (
                                    <li key={link.name}>
                                        {link.href ? (
                                            <Link
                                                href={link.href}
                                                className="text-white/70 hover:text-accent text-sm transition-colors"
                                            >
                                                {link.name}
                                            </Link>
                                        ) : (
                                            <span className="text-white/70 text-sm">
                                                {link.name}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {/* Contact & Payment Info */}
            <div className="border-t border-white/10">
                <div className="container py-8">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        {/* Contact Info */}
                        <div className="flex flex-wrap items-center gap-6 text-sm text-white/70">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                                </svg>
                                <span>Hotline: {SHOP_INFO.phone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                </svg>
                                <span>{SHOP_INFO.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                </svg>
                                <span>{SHOP_INFO.address}</span>
                            </div>
                        </div>

                        {/* Payment Methods */}
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-white/70 mr-2">Thanh toán:</span>
                            <div className="flex items-center gap-2">
                                {["VNPAY", "COD", "VISA", "MC"].map((method) => (
                                    <div
                                        key={method}
                                        className="px-3 py-1 bg-white/10 rounded text-xs font-medium text-white/90"
                                    >
                                        {method}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Copyright */}
            <div className="border-t border-white/10">
                <div className="container py-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-white/50">
                        <p>
                            © {currentYear} Clothing Shop. All rights reserved.
                        </p>
                        <div className="flex items-center gap-6">
                            <Link href="/privacy" className="hover:text-white transition-colors">
                                Chính sách bảo mật
                            </Link>
                            <Link href="/terms" className="hover:text-white transition-colors">
                                Điều khoản sử dụng
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}

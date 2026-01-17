"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import CartDrawer from "@/components/cart/CartDrawer";
import { SHOP_INFO } from "@/lib/constants";

// Icons
const SearchIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
    </svg>
);

const UserIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
        />
    </svg>
);

const ShoppingBagIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
        />
    </svg>
);

const MenuIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

const CloseIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const navigation = [
    { name: "Trang chủ", href: "/" },
    { name: "Sản phẩm", href: "/products" },
    { name: "Áo", href: "/products?category=ao" },
    { name: "Quần", href: "/products?category=quan" },
    { name: "Váy - Đầm", href: "/products?category=vay-dam" },
    { name: "Phụ kiện", href: "/products?category=phu-kien" },
];

export default function Header() {
    const pathname = usePathname();
    const { isAuthenticated, user, logout } = useAuth();

    // Hide header on admin pages
    if (pathname?.startsWith("/admin")) return null;

    const { cart, toggleCart } = useCart();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    // Handle scroll for sticky header
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Close mobile menu on resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setIsMobileMenuOpen(false);
            }
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
            setIsSearchOpen(false);
            setSearchQuery("");
        }
    };

    return (
        <>
            {/* Announcement Bar */}
            <div className="bg-primary text-primary-foreground text-center py-2 text-sm font-medium">
                <span className="hidden sm:inline">🎉 </span>
                Miễn Phí vận chuyển cho mọi đơn hàng
            </div>

            {/* Main Header */}
            <header
                className={`sticky top-0 z-50 transition-all duration-300 border-b border-transparent ${isScrolled
                    ? "bg-background/80 backdrop-blur-lg shadow-sm border-border/50"
                    : "bg-background"
                    }`}
            >
                <div className="container">
                    <div className="flex items-center justify-between h-16 lg:h-20">
                        {/* Mobile Menu Button */}
                        <button
                            className="lg:hidden p-2 -ml-2 text-foreground hover:text-accent transition-colors"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
                        </button>

                        {/* Logo */}
                        <Link
                            href="/"
                            className="flex items-center text-xl lg:text-2xl font-bold tracking-tight"
                        >
                            <span className="text-foreground">{SHOP_INFO.brandName1}</span>
                            <span className="text-accent ml-1">{SHOP_INFO.brandName2}</span>
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden lg:flex items-center space-x-8">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className="text-foreground/80 hover:text-accent transition-colors font-medium text-sm uppercase tracking-wider"
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </nav>

                        {/* Actions */}
                        <div className="flex items-center space-x-2 sm:space-x-4">
                            {/* Search Button */}
                            <button
                                className="p-2 text-foreground hover:text-accent transition-colors"
                                onClick={() => setIsSearchOpen(!isSearchOpen)}
                                aria-label="Search"
                            >
                                <SearchIcon />
                            </button>

                            {/* User Menu */}
                            <div className="relative">
                                <button
                                    className="p-2 text-foreground hover:text-accent transition-colors"
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    aria-label="Account"
                                >
                                    <UserIcon />
                                </button>

                                {/* User Dropdown */}
                                {isUserMenuOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setIsUserMenuOpen(false)}
                                        />
                                        <div className="absolute right-0 mt-2 w-56 bg-card text-card-foreground rounded-xl shadow-xl border border-border z-20 animate-fade-in overflow-hidden ring-1 ring-black/5">
                                            {isAuthenticated ? (
                                                <>
                                                    <div className="px-4 py-3 border-b border-border bg-muted/20">
                                                        <p className="text-sm font-medium text-foreground">
                                                            {user?.fullName}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {user?.email}
                                                        </p>
                                                    </div>
                                                    <div className="py-1">
                                                        <Link
                                                            href="/account"
                                                            className="block px-4 py-2 text-sm text-foreground hover:bg-accent/10 hover:text-accent transition-colors"
                                                            onClick={() => setIsUserMenuOpen(false)}
                                                        >
                                                            Tài khoản của tôi
                                                        </Link>
                                                        <Link
                                                            href="/account/orders"
                                                            className="block px-4 py-2 text-sm text-foreground hover:bg-accent/10 hover:text-accent transition-colors"
                                                            onClick={() => setIsUserMenuOpen(false)}
                                                        >
                                                            Đơn hàng
                                                        </Link>
                                                        <Link
                                                            href="/account/addresses"
                                                            className="block px-4 py-2 text-sm text-foreground hover:bg-accent/10 hover:text-accent transition-colors"
                                                            onClick={() => setIsUserMenuOpen(false)}
                                                        >
                                                            Địa chỉ
                                                        </Link>
                                                        <button
                                                            className="block w-full text-left px-4 py-2 text-sm text-error hover:bg-error/10 transition-colors"
                                                            onClick={() => {
                                                                logout();
                                                                setIsUserMenuOpen(false);
                                                            }}
                                                        >
                                                            Đăng xuất
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="py-1">
                                                    <Link
                                                        href="/login"
                                                        className="block px-4 py-3 text-sm font-medium text-foreground hover:bg-accent/10 hover:text-accent transition-colors"
                                                        onClick={() => setIsUserMenuOpen(false)}
                                                    >
                                                        Đăng nhập
                                                    </Link>
                                                    <Link
                                                        href="/register"
                                                        className="block px-4 py-3 text-sm font-medium text-accent hover:bg-accent/10 transition-colors"
                                                        onClick={() => setIsUserMenuOpen(false)}
                                                    >
                                                        Đăng ký
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Cart Button */}
                            <button
                                className="relative p-2 text-foreground hover:text-accent transition-colors"
                                onClick={toggleCart}
                                aria-label="Cart"
                            >
                                <ShoppingBagIcon />
                                {cart.itemCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-background">
                                        {cart.itemCount > 99 ? "99+" : cart.itemCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                {isSearchOpen && (
                    <div className="absolute left-0 right-0 border-t border-border bg-background/95 backdrop-blur-md animate-fade-in shadow-lg">
                        <div className="container py-4">
                            <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm sản phẩm..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-4 py-3 pr-12 bg-secondary rounded-xl border-transparent focus:border-accent focus:bg-background focus:ring-1 focus:ring-accent transition-all outline-none text-foreground placeholder:text-muted-foreground"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent transition-colors"
                                >
                                    <SearchIcon />
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <>
                        <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                        <div className="fixed inset-y-0 left-0 w-80 bg-background z-50 animate-slide-in-right lg:hidden overflow-y-auto shadow-2xl">
                            <div className="p-4 border-b border-border flex items-center justify-between">
                                <Link
                                    href="/"
                                    className="text-xl font-bold"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <span className="text-foreground">{SHOP_INFO.brandName1}</span>
                                    <span className="text-accent ml-1">{SHOP_INFO.brandName2}</span>
                                </Link>
                                <button
                                    className="p-2 text-muted-foreground hover:text-foreground"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <CloseIcon />
                                </button>
                            </div>

                            <nav className="p-4 space-y-1">
                                {navigation.map((item) => (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className="block px-4 py-3 text-foreground hover:bg-secondary rounded-lg transition-colors font-medium"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        {item.name}
                                    </Link>
                                ))}
                            </nav>

                            {!isAuthenticated && (
                                <div className="p-4 border-t border-border mt-auto">
                                    <Link
                                        href="/login"
                                        className="btn btn-primary w-full mb-3 shadow-lg shadow-primary/20"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        Đăng nhập
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="btn btn-outline w-full hover:bg-secondary"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        Đăng ký
                                    </Link>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </header>

            {/* Cart Drawer */}
            <CartDrawer />
        </>
    );
}

import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { SocketProvider } from "@/context/SocketContext";

// Font configurations
// Cấu hình font chữ Inter (cho văn bản thường) và Playfair Display (cho tiêu đề)
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

// Metadata SEO
// Thông tin SEO cho trang web
export const metadata = {
  title: {
    default: "Clothing Shop - Thời Trang Cao Cấp",
    template: "%s | Clothing Shop",
  },
  description:
    "Khám phá bộ sưu tập thời trang cao cấp với phong cách hiện đại, chất lượng vượt trội. Miễn phí vận chuyển toàn quốc.",
  keywords: [
    "thời trang",
    "quần áo",
    "fashion",
    "clothing",
    "áo",
    "quần",
    "váy đầm",
  ],
  authors: [{ name: "Clothing Shop" }],
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "Clothing Shop",
  },
};

// Root Layout Component
// Layout gốc cho toàn bộ ứng dụng
export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen flex flex-col antialiased">
        {/* Providers for Context (Auth, Cart, Socket) */}
        {/* Các Provider quản lý trạng thái: Auth (Đăng nhập), Cart (Giỏ hàng), Socket (Realtime) */}
        <AuthProvider>
          <CartProvider>
            <SocketProvider>
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </SocketProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

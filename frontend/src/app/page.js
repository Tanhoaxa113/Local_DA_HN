import Link from "next/link";
import Image from "next/image";
import ProductCard from "@/components/product/ProductCard";
import { productsAPI, categoriesAPI } from "@/lib/api";
import { SHOP_INFO } from "@/lib/constants";

// Icons
const ArrowRightIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

const TruckIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const HeadphonesIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
  </svg>
);

// Fetch data for the page
async function getFeaturedProducts() {
  try {
    const response = await productsAPI.getFeatured();
    return response.data?.data || [];
  } catch (error) {
    console.error("Failed to fetch featured products:", error);
    return [];
  }
}

async function getNewArrivals() {
  try {
    const response = await productsAPI.getAll({
      limit: 8,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    return response.data?.data || [];
  } catch (error) {
    console.error("Failed to fetch new arrivals:", error);
    return [];
  }
}

async function getCategories() {
  try {
    const response = await categoriesAPI.getAll();
    return response.data || [];
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return [];
  }
}

// Feature items for the features section
const features = [
  {
    icon: TruckIcon,
    title: "Miễn phí vận chuyển",
    description: "Vận chuyển toàn quốc",
  },
  {
    icon: ShieldIcon,
    title: "Bảo hành chất lượng",
    description: "Cam kết chính hãng 100%",
  },
  {
    icon: RefreshIcon,
    title: "Đổi trả dễ dàng",
    description: "Trong vòng 7 ngày",
  },
  {
    icon: HeadphonesIcon,
    title: "Hỗ trợ 24/7",
    description: `Hotline: ${SHOP_INFO.phone}`,
  },
];

// Default category images for fallback
const defaultCategoryImages = {
  "ao": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=500&fit=crop",
  "quan": "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&h=500&fit=crop",
  "vay-dam": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=500&fit=crop",
  "phu-kien": "https://images.unsplash.com/photo-1523779917675-b6ed3a42a561?w=400&h=500&fit=crop",
  "default": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=500&fit=crop",
};

export default async function HomePage() {
  // Fetch real data from API
  let featuredProducts = [];
  let newArrivals = [];
  let categories = [];

  try {
    const [featuredRes, newArrivalsRes, categoriesRes] = await Promise.all([
      getFeaturedProducts(),
      getNewArrivals(),
      getCategories(),
    ]);
    featuredProducts = featuredRes || [];
    newArrivals = newArrivalsRes || [];
    categories = categoriesRes || [];
  } catch (error) {
    console.error("Failed to fetch homepage data:", error);
  }

  // Add default images to categories if missing
  categories = categories.map((cat) => ({
    ...cat,
    image: cat.image || defaultCategoryImages[cat.slug] || defaultCategoryImages.default,
  }));

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-secondary overflow-hidden">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center min-h-[500px] lg:min-h-[600px] py-12 lg:py-0">
            {/* Content */}
            <div className="relative z-10 text-center lg:text-left">
              <span className="inline-block px-4 py-1.5 bg-accent/10 text-accent rounded-full text-sm font-medium mb-6">
                Bộ sưu tập mới 2026
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
                Phong cách
                <span className="block text-accent">Thời thượng</span>
              </h1>
              <p className="text-lg text-muted max-w-lg mx-auto lg:mx-0 mb-8">
                Khám phá bộ sưu tập thời trang mới nhất với thiết kế hiện đại,
                chất liệu cao cấp và giá cả hợp lý.
              </p>
              {/* Hero Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/products"
                  className="btn btn-lg btn-primary"
                >
                  Khám phá ngay
                  <ArrowRightIcon />
                </Link>
                <Link
                  href="/products?onSale=true"
                  className="btn btn-lg btn-outline"
                >
                  Xem khuyến mãi
                </Link>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative h-[400px] lg:h-[550px]">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent rounded-3xl" />
              <Image
                src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&h=1000&fit=crop"
                alt="Fashion Hero"
                fill
                className="object-cover rounded-3xl"
                priority
              />
              {/* Floating Badge */}
              <div className="absolute bottom-8 left-8 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🔥</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Giảm đến</p>
                    <p className="text-xl font-bold text-accent">50% OFF</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 border-b border-border">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="flex flex-col items-center text-center p-4">
                <div className="w-14 h-14 bg-secondary rounded-full flex items-center justify-center mb-3 text-accent">
                  <feature.icon />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                <p className="text-sm text-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 lg:py-20">
        <div className="container">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
                Danh mục sản phẩm
              </h2>
              <p className="text-muted mt-2">Khám phá các danh mục phổ biến</p>
            </div>
            <Link
              href="/products"
              className="hidden sm:flex items-center gap-2 text-accent hover:text-accent-hover font-medium transition-colors"
            >
              Xem tất cả
              <ArrowRightIcon />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="group relative aspect-[3/4] rounded-2xl overflow-hidden"
              >
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/5 transition-colors group-hover:bg-black/0" />
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg transition-transform duration-300 group-hover:-translate-y-1">
                  <h3 className="text-lg lg:text-xl font-bold text-center text-gray-900 uppercase tracking-wider">
                    {category.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-accent hover:text-accent-hover font-medium"
            >
              Xem tất cả danh mục
              <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16 lg:py-20 bg-secondary">
        <div className="container">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
                Sản phẩm nổi bật
              </h2>
              <p className="text-muted mt-2">Các sản phẩm được yêu thích nhất</p>
            </div>
            <Link
              href="/products?isFeatured=true"
              className="hidden sm:flex items-center gap-2 text-accent hover:text-accent-hover font-medium transition-colors"
            >
              Xem tất cả
              <ArrowRightIcon />
            </Link>
          </div>

          {featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted text-lg">Đang cập nhật sản phẩm...</p>
            </div>
          )}

          <div className="mt-10 text-center">
            <Link
              href="/products"
              className="btn btn-lg btn-primary"
            >
              Xem tất cả sản phẩm
              <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </section>

      {/* Sale Banner */}
      <section className="py-16 lg:py-20">
        <div className="container">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-primary to-primary-hover">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="relative grid lg:grid-cols-2 gap-8 items-center p-8 lg:p-16">
              <div className="text-center lg:text-left z-10">
                <span className="inline-block px-4 py-1.5 bg-accent text-accent-foreground rounded-full text-sm font-medium mb-4">
                  Flash Sale
                </span>
                <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4">
                  Giảm đến 50%
                </h2>
                <p className="text-white/80 text-lg mb-8 max-w-md mx-auto lg:mx-0">
                  Chương trình khuyến mãi đặc biệt cho tháng mới. Nhanh tay lên, số lượng có hạn!
                </p>
                <Link
                  href="/products?onSale=true"
                  className="btn btn-lg btn-white"
                >
                  Mua ngay
                  <ArrowRightIcon />
                </Link>
              </div>

              <div className="relative h-64 lg:h-80 z-10">
                <Image
                  src="https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&h=400&fit=crop"
                  alt="Sale Banner"
                  fill
                  className="object-cover rounded-2xl shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* New Arrivals Section */}
      <section className="py-16 lg:py-20 bg-secondary">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
              Hàng mới về
            </h2>
            <p className="text-muted mt-2">Cập nhật xu hướng thời trang mới nhất</p>
          </div>

          {newArrivals.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} variant="featured" />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted text-lg">Đang cập nhật sản phẩm...</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

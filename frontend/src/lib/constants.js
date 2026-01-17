/**
 * Shop Configuration Constants
 * Central location for shop information to be easily updated
 */

export const SHOP_INFO = {
    // Shop basic information
    name: process.env.NEXT_PUBLIC_SHOP_NAME || "Clothing Shop",
    email: process.env.NEXT_PUBLIC_SHOP_EMAIL || "support@clothingshop.vn",
    phone: process.env.NEXT_PUBLIC_SHOP_PHONE || "1900 1234",
    address: process.env.NEXT_PUBLIC_SHOP_ADDRESS || "123 Nguyễn Huệ, Q.1, TP.HCM",

    // Branding
    brandName: process.env.NEXT_PUBLIC_BRAND_NAME || "CLOTHING SHOP",
    brandName1: process.env.NEXT_PUBLIC_BRAND_NAME_1 || "CLOTHING",
    brandName2: process.env.NEXT_PUBLIC_BRAND_NAME_2 || "SHOP",
    tagline: "Thời trang cao cấp với phong cách hiện đại, chất lượng vượt trội.",

    // Social media links
    social: {
        facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL || "https://facebook.com",
        instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com",
        youtube: process.env.NEXT_PUBLIC_YOUTUBE_URL || "https://youtube.com",
        tiktok: process.env.NEXT_PUBLIC_TIKTOK_URL || "https://tiktok.com",
    },
};

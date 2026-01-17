/**
 * Product Seed File
 * Seeds 50 sample products with 1-3 variants each
 * Price range: 100,000 VND - 3,000,000 VND
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Helper function to generate random price between min and max
function randomPrice(min, max) {
    // Round to nearest 10,000 VND
    const price = Math.floor(Math.random() * (max - min + 1) + min);
    return Math.round(price / 10000) * 10000;
}

// Helper function to generate SKU
function generateSKU(productIndex, variantIndex) {
    return `SKU-${String(productIndex).padStart(3, '0')}-${String(variantIndex).padStart(2, '0')}`;
}

// Helper function to create slug from name
function slugify(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

// Color definitions with hex codes
const colors = [
    { name: 'Đen', code: '#000000' },
    { name: 'Trắng', code: '#FFFFFF' },
    { name: 'Xám', code: '#808080' },
    { name: 'Xanh Navy', code: '#001F3F' },
    { name: 'Xanh Dương', code: '#0074D9' },
    { name: 'Đỏ', code: '#FF4136' },
    { name: 'Hồng', code: '#FF69B4' },
    { name: 'Be', code: '#F5F5DC' },
    { name: 'Nâu', code: '#8B4513' },
    { name: 'Xanh Lá', code: '#2ECC40' },
    { name: 'Vàng', code: '#FFDC00' },
    { name: 'Cam', code: '#FF851B' },
];

// Size definitions by category type
const sizes = {
    tops: ['S', 'M', 'L', 'XL', 'XXL'],
    bottoms: ['28', '29', '30', '31', '32', '33', '34'],
    dresses: ['S', 'M', 'L', 'XL'],
    accessories: ['Free Size'],
};

// Product templates by category
const productTemplates = {
    // Category 1: Áo (Tops)
    ao: [
        { name: 'Áo Thun Basic Cotton', description: 'Áo thun basic chất liệu cotton 100% mềm mại, thoáng mát. Phù hợp mặc hàng ngày.' },
        { name: 'Áo Polo Classic', description: 'Áo polo cổ bẻ phong cách lịch lãm, chất liệu cotton pha spandex co giãn thoải mái.' },
        { name: 'Áo Sơ Mi Oxford', description: 'Áo sơ mi Oxford dài tay, phom regular fit, phù hợp đi làm và các dịp quan trọng.' },
        { name: 'Áo Hoodie Oversize', description: 'Áo hoodie oversize chất nỉ bông dày dặn, giữ ấm tốt, mũ trùm đầu tiện lợi.' },
        { name: 'Áo Khoác Bomber', description: 'Áo khoác bomber phong cách streetwear, chất liệu dù chống nước nhẹ.' },
        { name: 'Áo Blazer Công Sở', description: 'Áo blazer 2 lớp cao cấp, thiết kế thanh lịch phù hợp công sở và sự kiện.' },
        { name: 'Áo Len Cổ Tròn', description: 'Áo len cổ tròn ấm áp, chất len mềm mịn không gây ngứa.' },
        { name: 'Áo Thun In Họa Tiết', description: 'Áo thun in họa tiết trendy, chất cotton organic thân thiện môi trường.' },
        { name: 'Áo Cardigan Len', description: 'Áo cardigan len cài khuy, phong cách vintage retro ấm áp.' },
        { name: 'Áo Tank Top Thể Thao', description: 'Áo tank top thể thao, chất vải mesh thoáng khí, thấm hút mồ hôi.' },
        { name: 'Áo Sơ Mi Flannel', description: 'Áo sơ mi flannel kẻ caro, chất vải cotton nỉ mềm ấm.' },
        { name: 'Áo Khoác Denim', description: 'Áo khoác jeans denim wash cổ điển, phong cách casual bụi bặm.' },
        { name: 'Áo Croptop Nữ', description: 'Áo croptop nữ tính, chất cotton co giãn nhẹ, phù hợp mix&match.' },
    ],
    // Category 2: Quần (Bottoms)
    quan: [
        { name: 'Quần Jeans Slim Fit', description: 'Quần jeans slim fit co giãn, wash nhẹ hiện đại, thoải mái vận động.' },
        { name: 'Quần Kaki Công Sở', description: 'Quần kaki ống đứng, chất vải không nhăn, phù hợp đi làm văn phòng.' },
        { name: 'Quần Short Jean', description: 'Quần short jeans basic, gấu rách cá tính, phù hợp mùa hè.' },
        { name: 'Quần Jogger Thể Thao', description: 'Quần jogger bo gấu, chất nỉ bông mềm, túi khóa tiện lợi.' },
        { name: 'Quần Âu Regular', description: 'Quần âu regular fit, chất vải cao cấp, ly sắc nét chuyên nghiệp.' },
        { name: 'Quần Cargo Túi Hộp', description: 'Quần cargo nhiều túi phong cách utility, chất kaki dày dặn.' },
        { name: 'Quần Legging Nữ', description: 'Quần legging nữ co giãn 4 chiều, ôm sát tôn dáng, gen bụng nhẹ.' },
        { name: 'Quần Culottes Ống Rộng', description: 'Quần culottes ống rộng thanh lịch, chất vải rũ nhẹ nhàng.' },
        { name: 'Quần Baggy Jeans', description: 'Quần baggy jeans ống suông rộng, phong cách Y2K retro.' },
        { name: 'Quần Short Thể Thao', description: 'Quần short thể thao 2 lớp, chất vải quick-dry khô nhanh.' },
        { name: 'Quần Tây Ống Đứng', description: 'Quần tây ống đứng classic, chất wool blend cao cấp.' },
        { name: 'Quần Dài Lưng Cao', description: 'Quần dài lưng cao tôn dáng, ống vừa thanh lịch hiện đại.' },
    ],
    // Category 3: Váy - Đầm (Dresses)
    'vay-dam': [
        { name: 'Đầm Suông Công Sở', description: 'Đầm suông công sở thanh lịch, cổ V nhẹ nhàng, dài qua gối.' },
        { name: 'Váy Midi Xòe', description: 'Váy midi xòe nữ tính, chất vải chiffon bay bổng, in hoa nhẹ nhàng.' },
        { name: 'Đầm Bodycon Ôm Sát', description: 'Đầm bodycon ôm sát tôn dáng, chất thun dày dặn co giãn.' },
        { name: 'Váy Tennis Xếp Ly', description: 'Váy tennis xếp ly năng động, có quần lót trong tiện lợi.' },
        { name: 'Đầm Maxi Đi Biển', description: 'Đầm maxi dài đi biển, họa tiết tropical tươi mát, vải lanh mát.' },
        { name: 'Váy Jean Denim', description: 'Váy jean denim chữ A, có túi tiện dụng, phong cách casual.' },
        { name: 'Đầm Dự Tiệc Sequin', description: 'Đầm dự tiệc đính sequin lấp lánh, thiết kế sang trọng quyến rũ.' },
        { name: 'Váy Hoa Nhí Vintage', description: 'Váy hoa nhí phong cách vintage, cổ vuông nữ tính, tay phồng.' },
        { name: 'Đầm Wrap Thắt Eo', description: 'Đầm wrap thắt eo tôn dáng, chất lụa mềm mại sang trọng.' },
        { name: 'Váy Len Cổ Lọ', description: 'Váy len cổ lọ ấm áp mùa đông, phom suông thoải mái.' },
        { name: 'Đầm Sơ Mi Dáng Dài', description: 'Đầm sơ mi dáng dài phong cách minimalist, có đai thắt eo.' },
        { name: 'Váy Xòe Cổ Điển', description: 'Váy xòe cổ điển phong cách Hepburn, chất gấm cao cấp.' },
    ],
    // Category 4: Phụ kiện (Accessories)
    'phu-kien': [
        { name: 'Mũ Lưỡi Trai Baseball', description: 'Mũ lưỡi trai phong cách sporty, khóa điều chỉnh phía sau.' },
        { name: 'Túi Tote Canvas', description: 'Túi tote canvas đựng đồ tiện lợi, in họa tiết độc đáo.' },
        { name: 'Thắt Lưng Da Bò', description: 'Thắt lưng da bò thật cao cấp, khóa kim loại chắc chắn.' },
        { name: 'Khăn Choàng Cashmere', description: 'Khăn choàng cổ chất cashmere mềm mại, giữ ấm tuyệt vời.' },
        { name: 'Kính Mát Thời Trang', description: 'Kính mát thời trang chống UV400, gọng kim loại nhẹ.' },
        { name: 'Balo Da Minimal', description: 'Balo da phong cách tối giản, ngăn laptop 15 inch, chất da PU cao cấp.' },
        { name: 'Ví Dài Nữ', description: 'Ví dài nữ nhiều ngăn, chất da mềm, đựng điện thoại vừa vặn.' },
        { name: 'Găng Tay Da Mùa Đông', description: 'Găng tay da lót lông giữ ấm, cảm ứng được điện thoại.' },
        { name: 'Mũ Bucket Hat', description: 'Mũ bucket hat phong cách chill, chất vải cotton mềm nhẹ.' },
        { name: 'Túi Đeo Chéo Nhỏ', description: 'Túi đeo chéo mini đựng điện thoại, dây da điều chỉnh được.' },
        { name: 'Nón Beanie Len', description: 'Nón beanie len giữ ấm mùa đông, co giãn đa size.' },
        { name: 'Dây Nịt Vải Canvas', description: 'Dây nịt vải canvas khóa nhựa, phong cách sporty casual.' },
        { name: 'Túi Xách Cầm Tay', description: 'Túi xách cầm tay thanh lịch, phù hợp đi làm và dự tiệc.' },
    ],
};

// Placeholder images by category
const placeholderImages = {
    ao: 'https://placehold.co/600x800/e0e0e0/666666?text=Áo',
    quan: 'https://placehold.co/600x800/e0e0e0/666666?text=Quần',
    'vay-dam': 'https://placehold.co/600x800/e0e0e0/666666?text=Váy+Đầm',
    'phu-kien': 'https://placehold.co/600x800/e0e0e0/666666?text=Phụ+Kiện',
};

async function seedProducts() {
    console.log('🔄 Seeding products...');

    // Get categories
    const categoriesData = await prisma.category.findMany();
    const categoryMap = {};
    for (const cat of categoriesData) {
        categoryMap[cat.slug] = cat.id;
    }

    // Get brands
    const brandsData = await prisma.brand.findMany();
    const brandIds = brandsData.map(b => b.id);

    let productIndex = 1;
    const products = [];

    // Generate 50 products
    const categoryOrder = ['ao', 'quan', 'vay-dam', 'phu-kien'];
    let currentCategoryIndex = 0;

    while (products.length < 50) {
        const categorySlug = categoryOrder[currentCategoryIndex % categoryOrder.length];
        const templates = productTemplates[categorySlug];
        const template = templates[products.length % templates.length];

        const categoryId = categoryMap[categorySlug];
        if (!categoryId) {
            console.log(`Category ${categorySlug} not found, skipping...`);
            currentCategoryIndex++;
            continue;
        }

        // Randomly assign a brand (or null)
        const brandId = Math.random() > 0.2 ? brandIds[Math.floor(Math.random() * brandIds.length)] : null;

        // Generate unique product name with index
        const productName = products.length < templates.length
            ? template.name
            : `${template.name} V${Math.floor(products.length / templates.length) + 1}`;

        const productSlug = slugify(productName) + '-' + productIndex;

        // Determine price range based on category
        let minPrice = 100000;
        let maxPrice = 3000000;

        if (categorySlug === 'phu-kien') {
            minPrice = 100000;
            maxPrice = 1500000;
        } else if (categorySlug === 'vay-dam') {
            minPrice = 250000;
            maxPrice = 3000000;
        }

        const basePrice = randomPrice(minPrice, maxPrice);

        // Generate 1-3 variants
        const numVariants = Math.floor(Math.random() * 3) + 1;
        const variants = [];

        // Get size type based on category
        let sizeType = 'tops';
        if (categorySlug === 'quan') sizeType = 'bottoms';
        else if (categorySlug === 'vay-dam') sizeType = 'dresses';
        else if (categorySlug === 'phu-kien') sizeType = 'accessories';

        const availableSizes = sizes[sizeType];
        const usedCombinations = new Set();

        for (let v = 0; v < numVariants; v++) {
            // Pick random size and color
            let size, color, combination;
            let attempts = 0;
            do {
                size = availableSizes[Math.floor(Math.random() * availableSizes.length)];
                color = colors[Math.floor(Math.random() * colors.length)];
                combination = `${size}-${color.name}`;
                attempts++;
            } while (usedCombinations.has(combination) && attempts < 20);

            usedCombinations.add(combination);

            // Slightly vary price per variant (+/- 50,000 VND)
            const variantPrice = Math.max(100000, basePrice + (Math.floor(Math.random() * 5) - 2) * 10000);

            // Compare at price (original/sale price) - 70% chance of having one
            const hasComparePrice = Math.random() > 0.3;
            const compareAtPrice = hasComparePrice ? Math.round(variantPrice * (1.2 + Math.random() * 0.3)) : null;

            // Random stock
            const stock = Math.floor(Math.random() * 50) + 5;

            variants.push({
                sku: generateSKU(productIndex, v + 1),
                size,
                color: color.name,
                colorCode: color.code,
                price: variantPrice,
                compareAtPrice: compareAtPrice ? Math.round(compareAtPrice / 10000) * 10000 : null,
                costPrice: Math.round(variantPrice * 0.5),
                stock,
                availableStock: stock,
                lowStockThreshold: 5,
                isActive: true,
            });
        }

        products.push({
            name: productName,
            slug: productSlug,
            description: template.description,
            categoryId,
            brandId,
            isActive: true,
            isFeatured: Math.random() > 0.8, // 20% featured
            variants,
            imageUrl: placeholderImages[categorySlug],
        });

        productIndex++;
        currentCategoryIndex++;
    }

    // Insert products with variants and images
    for (let i = 0; i < products.length; i++) {
        const product = products[i];
        console.log(`  Creating product ${i + 1}/50: ${product.name}`);

        // Check if product already exists
        const existing = await prisma.product.findUnique({
            where: { slug: product.slug }
        });

        if (existing) {
            console.log(`  → Product ${product.name} already exists, skipping...`);
            continue;
        }

        const createdProduct = await prisma.product.create({
            data: {
                name: product.name,
                slug: product.slug,
                description: product.description,
                categoryId: product.categoryId,
                brandId: product.brandId,
                isActive: product.isActive,
                isFeatured: product.isFeatured,
                variants: {
                    create: product.variants,
                },
                images: {
                    create: {
                        url: product.imageUrl,
                        altText: product.name,
                        sortOrder: 0,
                        isPrimary: true,
                    },
                },
            },
        });

        console.log(`  → Created with ${product.variants.length} variant(s)`);
    }

    console.log('✅ Products seeded successfully');
}

async function main() {
    console.log('================================================');
    console.log('🌱 Starting product seed...');
    console.log('================================================\n');

    try {
        await seedProducts();

        console.log('\n================================================');
        console.log('✅ Products seeded successfully!');
        console.log('================================================');
    } catch (error) {
        console.error('❌ Seed failed:', error);
        throw error;
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

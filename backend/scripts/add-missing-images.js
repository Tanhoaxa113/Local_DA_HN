const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Find products without images
    const productsWithoutImages = await prisma.product.findMany({
        where: {
            images: {
                none: {}
            }
        },
        include: {
            category: true
        }
    });

    console.log(`Found ${productsWithoutImages.length} products without images:`);
    productsWithoutImages.forEach(p => console.log(`  - ${p.id}: ${p.name} (${p.category?.name})`));

    if (productsWithoutImages.length === 0) {
        console.log('\nAll products have images!');
        return;
    }

    // Add placeholder images for each product based on category
    const categoryImageMap = {
        'Áo': 'Áo',
        'Quần': 'Quần',
        'Váy - Đầm': 'Váy+Đầm',
        'Phụ Kiện': 'Phụ+Kiện'
    };

    console.log('\nAdding placeholder images...');

    for (const product of productsWithoutImages) {
        const categoryText = categoryImageMap[product.category?.name] || 'Product';
        const imageUrl = `https://placehold.co/600x800/e0e0e0/666666?text=${categoryText}`;

        await prisma.productImage.create({
            data: {
                productId: product.id,
                url: imageUrl,
                altText: product.name,
                sortOrder: 0,
                isPrimary: true
            }
        });

        console.log(`  ✓ Added image for: ${product.name}`);
    }

    console.log('\nDone!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

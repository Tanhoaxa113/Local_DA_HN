const prisma = require('../src/config/database');

async function backfillMinPrice() {
    console.log('Starting minPrice backfill...');

    try {
        const products = await prisma.product.findMany({
            include: {
                variants: true
            }
        });

        console.log(`Found ${products.length} products.`);

        for (const product of products) {
            // Logic from product.service.js
            let minPrice = 0;
            if (product.variants && product.variants.length > 0) {
                minPrice = Math.min(...product.variants.map(v => Number(v.price)));
            }

            // Update if different
            if (Number(product.minPrice) !== minPrice) {
                await prisma.product.update({
                    where: { id: product.id },
                    data: { minPrice }
                });
                console.log(`Updated product ${product.id} (${product.name}): ${product.minPrice} -> ${minPrice}`);
            }
        }

        console.log('Backfill complete.');
    } catch (error) {
        console.error('Backfill failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

backfillMinPrice();

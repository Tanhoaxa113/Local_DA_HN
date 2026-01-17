const prisma = require('./src/config/database');

async function main() {
    console.log('Recalculating product data...');

    const products = await prisma.product.findMany({
        include: {
            variants: {
                include: {
                    orderItems: true
                }
            }
        }
    });

    console.log(`Found ${products.length} products.`);

    for (const product of products) {
        let minPrice = 0;
        let totalSold = 0;

        if (product.variants.length > 0) {
            // Calculate min price
            const prices = product.variants.map(v => Number(v.price));
            minPrice = Math.min(...prices);

            // Calculate total sold
            totalSold = product.variants.reduce((acc, variant) => {
                const variantSold = variant.orderItems.reduce((sum, item) => sum + item.quantity, 0);
                return acc + variantSold;
            }, 0);
        }

        await prisma.product.update({
            where: { id: product.id },
            data: {
                minPrice: minPrice,
                totalSold: totalSold
            }
        });

        console.log(`Updated Product ${product.id} (${product.name}): MinPrice=${minPrice}, Sold=${totalSold}`);
    }

    console.log('Done!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

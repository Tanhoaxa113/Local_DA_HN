const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Get recent orders and their items with images (using NEW query style)
    const orders = await prisma.order.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: {
            items: {
                take: 3,
                include: {
                    variant: {
                        include: {
                            product: {
                                include: {
                                    images: {
                                        orderBy: [
                                            { isPrimary: 'desc' },
                                            { sortOrder: 'asc' }
                                        ],
                                        take: 1
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    console.log('Recent Orders with Items (NEW QUERY):');
    orders.forEach(order => {
        console.log(`\n=== Order ${order.orderNumber} ===`);
        order.items.forEach(item => {
            console.log(`  - Item: ${item.productName}`);
            console.log(`    Variant: ${item.variant?.size}/${item.variant?.color}`);
            console.log(`    Product Images:`, item.variant?.product?.images?.length || 0);
            if (item.variant?.product?.images?.[0]) {
                console.log(`    Image URL: ${item.variant.product.images[0].url}`);
            } else {
                console.log('    NO IMAGE FOUND!');
            }
        });
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

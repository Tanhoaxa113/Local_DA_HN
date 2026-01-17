const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const images = await prisma.productImage.findMany({ take: 5 });
    console.log('Product Images:', JSON.stringify(images, null, 2));

    // Also check an order item to see the data structure
    const orderItem = await prisma.orderItem.findFirst({
        include: {
            variant: {
                include: {
                    product: {
                        include: {
                            images: {
                                where: { isPrimary: true },
                                take: 1
                            }
                        }
                    }
                }
            }
        }
    });
    console.log('\nOrder Item with Variant + Product:', JSON.stringify(orderItem, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

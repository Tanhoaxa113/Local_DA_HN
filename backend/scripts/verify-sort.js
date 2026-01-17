const prisma = require('../src/config/database');

async function verifySort() {
    console.log('Verifying sort by minPrice...');
    try {
        const products = await prisma.product.findMany({
            take: 5,
            orderBy: {
                minPrice: 'asc'
            },
            select: {
                id: true,
                name: true,
                minPrice: true
            }
        });

        console.log('Successfully fetched products sorted by minPrice:');
        products.forEach(p => console.log(`- ${p.name}: ${p.minPrice}`));
        console.log('VERIFICATION SUCCESS');
    } catch (error) {
        console.error('VERIFICATION FAILED:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifySort();

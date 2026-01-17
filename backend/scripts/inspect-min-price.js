const prisma = require('../src/config/database');

async function inspectData() {
    console.log('Inspecting product prices...');
    const products = await prisma.product.findMany({
        take: 20,
        include: {
            variants: {
                select: { price: true }
            }
        }
    });

    console.log('ID | Name | MinPrice (DB) | Min Variant Price (Calc)');
    console.log('---|---|---|---');

    for (const p of products) {
        const prices = p.variants.map(v => Number(v.price));
        const calcMin = prices.length > 0 ? Math.min(...prices) : 0;

        console.log(`${p.id} | ${p.name.substring(0, 20)} | ${p.minPrice} | ${calcMin}`);
    }
}

inspectData()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

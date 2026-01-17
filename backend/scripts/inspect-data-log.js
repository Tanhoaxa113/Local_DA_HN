const fs = require('fs');
const prisma = require('../src/config/database');

async function inspect() {
    const logFile = 'inspect.log';
    const log = (msg) => fs.appendFileSync(logFile, msg + '\n');

    try {
        fs.writeFileSync(logFile, 'Starting inspection...\n');

        const products = await prisma.product.findMany({
            take: 20,
            include: {
                variants: {
                    select: { price: true }
                }
            },
            orderBy: { id: 'asc' }
        });

        log(`Found ${products.length} products to inspect.`);
        log('ID | Name | MinPrice (DB) | Min Variant Price (Calc)');

        for (const p of products) {
            const prices = p.variants.map(v => Number(v.price));
            const calcMin = prices.length > 0 ? Math.min(...prices) : 0;
            log(`${p.id} | ${p.name.substring(0, 20)} | ${p.minPrice} | ${calcMin}`);
        }

        log('Done.');
    } catch (e) {
        log('Error: ' + e.message);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

inspect();

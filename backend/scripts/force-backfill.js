const fs = require('fs');
require('dotenv').config();
const prisma = require('../src/config/database');

async function forceBackfill() {
    const logFile = 'force_backfill.log';
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    };

    try {
        fs.writeFileSync(logFile, 'Starting force backfill...\n');
        log('Fetching products...');

        const products = await prisma.product.findMany({
            include: {
                variants: true
            }
        });

        log(`Found ${products.length} products.`);

        let updatedCount = 0;

        for (const p of products) {
            let minPrice = 0;
            if (p.variants && p.variants.length > 0) {
                // Ensure we handle Decimal/String/Number correctly
                const prices = p.variants.map(v => Number(v.price));
                minPrice = Math.min(...prices);
            }

            // Update indiscriminately or check? Let's check to allow logging
            const currentMin = Number(p.minPrice);

            // Use a small epsilon for float comparison if needed, but usually equality is fine for currency if same source
            if (currentMin !== minPrice) {
                log(`Updating ID ${p.id}: ${currentMin} -> ${minPrice}`);
                await prisma.product.update({
                    where: { id: p.id },
                    data: { minPrice }
                });
                updatedCount++;
            } else {
                // log(`ID ${p.id} OK (${currentMin})`);
            }
        }

        log(`Backfill complete. Updated ${updatedCount} products.`);

    } catch (e) {
        log('ERROR: ' + e.message);
        log(e.stack);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

forceBackfill();

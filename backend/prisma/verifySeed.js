const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function verify() {
    let log = 'Verifying seed data...\n';
    try {
        const productCount = await prisma.product.count();
        const variantCount = await prisma.productVariant.count();

        log += `Total Products: ${productCount}\n`;
        log += `Total Variants: ${variantCount}\n`;

        if (productCount === 0) {
            log += '❌ No products found!\n';
        } else {
            const sampleProduct = await prisma.product.findFirst({
                include: { variants: true }
            });

            log += `Sample Product: ${sampleProduct.name}\n`;
            log += `Variants: ${sampleProduct.variants.length}\n`;
            log += `Price: ${sampleProduct.variants[0].price}\n`;

            if (productCount >= 50 && variantCount >= 50) {
                log += '✅ Seed verification successful!\n';
            } else {
                log += '⚠️ Seed verification incomplete.\n';
            }
        }
    } catch (e) {
        log += `Error: ${e.message}\n`;
    } finally {
        fs.writeFileSync(path.join(__dirname, 'verification_result.log'), log);
        await prisma.$disconnect();
    }
}

verify().catch(console.error);

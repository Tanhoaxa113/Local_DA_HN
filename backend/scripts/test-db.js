const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

async function main() {
    console.log('Testing connection...');
    try {
        await prisma.$connect();
        console.log('Connection successful!');
        const productCount = await prisma.product.count();
        console.log('Product count:', productCount);
    } catch (e) {
        console.error('Connection failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Fixing OrderStatus ENUM in MySQL...');

    // Full list of enums including REFUND_CONFIRMED
    const enumString = `'PENDING_PAYMENT', 'PROCESSING_FAILED', 'PENDING_CONFIRMATION', 'PREPARING', 'READY_TO_SHIP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED', 'RETURNED_TO_WAREHOUSE', 'DELIVERED', 'REFUND_REQUESTED', 'REFUNDING', 'REFUNDED', 'REFUND_CONFIRMED', 'COMPLETED', 'CANCELLED'`;

    try {
        console.log('Updating orders table...');
        await prisma.$executeRawUnsafe(`ALTER TABLE orders MODIFY COLUMN status ENUM(${enumString}) NOT NULL DEFAULT 'PENDING_PAYMENT';`);
        console.log('✓ Updated orders table');

        console.log('Updating order_status_histories table...');
        await prisma.$executeRawUnsafe(`ALTER TABLE order_status_histories MODIFY COLUMN fromStatus ENUM(${enumString}) NULL;`);
        console.log('✓ Updated order_status_histories table (fromStatus)');

        await prisma.$executeRawUnsafe(`ALTER TABLE order_status_histories MODIFY COLUMN toStatus ENUM(${enumString}) NOT NULL;`);
        console.log('✓ Updated order_status_histories table (toStatus)');

        console.log('Enum update completed successfully!');
    } catch (e) {
        console.error('Error updating enums:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Fixing OrderStatus enum...');
    try {
        // We strictly use the enum values from the schema
        await prisma.$executeRawUnsafe(`
      ALTER TABLE orders MODIFY COLUMN status ENUM(
        'PENDING_PAYMENT',
        'PROCESSING_FAILED',
        'PENDING_CONFIRMATION',
        'PREPARING',
        'READY_TO_SHIP',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'DELIVERY_FAILED',
        'RETURNED_TO_WAREHOUSE',
        'DELIVERED',
        'REFUND_REQUESTED',
        'REFUNDING',
        'REFUNDED',
        'REFUND_CONFIRMED',
        'COMPLETED',
        'CANCELLED'
      ) DEFAULT 'PENDING_PAYMENT';
    `);
        console.log('Successfully updated OrderStatus enum in database.');
    } catch (e) {
        console.error('Error updating enum:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

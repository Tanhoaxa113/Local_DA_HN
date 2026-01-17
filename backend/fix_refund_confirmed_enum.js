const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOrderStatusEnum() {
    try {
        console.log('Adding REFUND_CONFIRMED to OrderStatus enum in orders table...');

        // Alter the orders table to add REFUND_CONFIRMED to the status enum
        await prisma.$executeRawUnsafe(`
      ALTER TABLE orders 
      MODIFY COLUMN status ENUM(
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
      ) NOT NULL DEFAULT 'PENDING_PAYMENT'
    `);

        console.log('✅ orders.status enum updated successfully!');

        console.log('Adding REFUND_CONFIRMED to OrderStatus enum in order_status_histories table...');

        // Also update the order_status_histories table
        await prisma.$executeRawUnsafe(`
      ALTER TABLE order_status_histories 
      MODIFY COLUMN fromStatus ENUM(
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
      ) NULL
    `);

        await prisma.$executeRawUnsafe(`
      ALTER TABLE order_status_histories 
      MODIFY COLUMN toStatus ENUM(
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
      ) NOT NULL
    `);

        console.log('✅ order_status_histories enum columns updated successfully!');
        console.log('');
        console.log('🎉 All enum updates completed! You can now use REFUND_CONFIRMED status.');

    } catch (error) {
        console.error('❌ Error updating enum:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixOrderStatusEnum();

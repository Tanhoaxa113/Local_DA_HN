/**
 * Database Seed File
 * Seeds initial data for Roles, Member Tiers, and optionally test data
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Role definitions
const roles = [
    { name: 'CUSTOMER', description: 'Regular customer - can browse, order, manage profile' },
    { name: 'SALES_STAFF', description: 'Sales staff - can confirm orders, change order status' },
    { name: 'WAREHOUSE', description: 'Warehouse staff - can view packing list, update shipping status' },
    { name: 'SALES_MANAGER', description: 'Sales manager - can approve refunds, view reports' },
    { name: 'ADMIN', description: 'Administrator - full system access' },
];

// Member tier definitions
const memberTiers = [
    {
        name: 'BRONZE',
        minPoints: 0,
        discountPercent: 0,
        monthlyDiscountLimit: 0,
        pointMultiplier: 1.0
    },
    {
        name: 'SILVER',
        minPoints: 1000,
        discountPercent: 3,
        monthlyDiscountLimit: 2,
        pointMultiplier: 1.2
    },
    {
        name: 'GOLD',
        minPoints: 5000,
        discountPercent: 5,
        monthlyDiscountLimit: 3,
        pointMultiplier: 1.5
    },
    {
        name: 'PLATINUM',
        minPoints: 15000,
        discountPercent: 8,
        monthlyDiscountLimit: 5,
        pointMultiplier: 1.8
    },
    {
        name: 'DIAMOND',
        minPoints: 30000,
        discountPercent: 12,
        monthlyDiscountLimit: 10,
        pointMultiplier: 2.0
    },
];

// Default categories
const categories = [
    { name: 'Áo', slug: 'ao', description: 'Các loại áo' },
    { name: 'Quần', slug: 'quan', description: 'Các loại quần' },
    { name: 'Váy - Đầm', slug: 'vay-dam', description: 'Váy và đầm nữ' },
    { name: 'Phụ kiện', slug: 'phu-kien', description: 'Phụ kiện thời trang' },
];

// Default brands
const brands = [
    { name: 'Local Brand', slug: 'local-brand', description: 'Thương hiệu nội địa' },
    { name: 'Uniqlo', slug: 'uniqlo', description: 'Thương hiệu Nhật Bản' },
    { name: 'H&M', slug: 'h-m', description: 'Thương hiệu Thụy Điển' },
    { name: 'Zara', slug: 'zara', description: 'Thương hiệu Tây Ban Nha' },
];



async function seedRoles() {
    console.log('🔄 Seeding roles...');
    for (const role of roles) {
        await prisma.role.upsert({
            where: { name: role.name },
            update: role,
            create: role,
        });
    }
    console.log('✅ Roles seeded');
}

async function seedMemberTiers() {
    console.log('🔄 Seeding member tiers...');
    for (const tier of memberTiers) {
        await prisma.memberTier.upsert({
            where: { name: tier.name },
            update: tier,
            create: tier,
        });
    }
    console.log('✅ Member tiers seeded');
}

async function seedCategories() {
    console.log('🔄 Seeding categories...');
    for (const category of categories) {
        await prisma.category.upsert({
            where: { slug: category.slug },
            update: category,
            create: category,
        });
    }
    console.log('✅ Categories seeded');
}

async function seedBrands() {
    console.log('🔄 Seeding brands...');
    for (const brand of brands) {
        await prisma.brand.upsert({
            where: { slug: brand.slug },
            update: brand,
            create: brand,
        });
    }
    console.log('✅ Brands seeded');
}

async function seedAdminUser() {
    console.log('🔄 Seeding admin user...');

    const adminRole = await prisma.role.findUnique({
        where: { name: 'ADMIN' },
    });

    const bronzeTier = await prisma.memberTier.findUnique({
        where: { name: 'BRONZE' },
    });

    if (!adminRole || !bronzeTier) {
        throw new Error('Required role or tier not found. Run seed for roles and tiers first.');
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);

    await prisma.user.upsert({
        where: { email: 'admin@clothingshop.com' },
        update: {},
        create: {
            email: 'admin@clothingshop.com',
            password: hashedPassword,
            fullName: 'System Administrator',
            phone: '0900000000',
            roleId: adminRole.id,
            tierId: bronzeTier.id,
            isActive: true,
        },
    });

    console.log('✅ Admin user seeded successfully');
    console.log('   📧 Email: admin@clothingshop.com');
    console.log('   🔑 Password: admin123');
}

async function main() {
    console.log('================================================');
    console.log('🌱 Starting database seed...');
    console.log('================================================\n');

    try {
        await seedRoles();
        await seedMemberTiers();
        await seedCategories();
        await seedBrands();
        await seedAdminUser();

        console.log('\n================================================');
        console.log('✅ Database seeded successfully!');
        console.log('================================================');
    } catch (error) {
        console.error('❌ Seed failed:', error);
        throw error;
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

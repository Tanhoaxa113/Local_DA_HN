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

// Vietnam Provinces (Major cities with districts and wards)
const vietnamProvinces = [
    {
        code: '01',
        name: 'Hà Nội',
        nameEn: 'Hanoi',
        fullName: 'Thành phố Hà Nội',
        codeName: 'ha_noi',
        districts: [
            {
                code: '001',
                name: 'Ba Đình',
                nameEn: 'Ba Dinh',
                fullName: 'Quận Ba Đình',
                codeName: 'ba_dinh',
                wards: [
                    { code: '00001', name: 'Phúc Xá', nameEn: 'Phuc Xa', fullName: 'Phường Phúc Xá', codeName: 'phuc_xa' },
                    { code: '00002', name: 'Trúc Bạch', nameEn: 'Truc Bach', fullName: 'Phường Trúc Bạch', codeName: 'truc_bach' },
                    { code: '00003', name: 'Vĩnh Phúc', nameEn: 'Vinh Phuc', fullName: 'Phường Vĩnh Phúc', codeName: 'vinh_phuc' },
                ]
            },
            {
                code: '002',
                name: 'Hoàn Kiếm',
                nameEn: 'Hoan Kiem',
                fullName: 'Quận Hoàn Kiếm',
                codeName: 'hoan_kiem',
                wards: [
                    { code: '00010', name: 'Hàng Bạc', nameEn: 'Hang Bac', fullName: 'Phường Hàng Bạc', codeName: 'hang_bac' },
                    { code: '00011', name: 'Hàng Bông', nameEn: 'Hang Bong', fullName: 'Phường Hàng Bông', codeName: 'hang_bong' },
                    { code: '00012', name: 'Hàng Đào', nameEn: 'Hang Dao', fullName: 'Phường Hàng Đào', codeName: 'hang_dao' },
                ]
            },
            {
                code: '003',
                name: 'Cầu Giấy',
                nameEn: 'Cau Giay',
                fullName: 'Quận Cầu Giấy',
                codeName: 'cau_giay',
                wards: [
                    { code: '00020', name: 'Nghĩa Đô', nameEn: 'Nghia Do', fullName: 'Phường Nghĩa Đô', codeName: 'nghia_do' },
                    { code: '00021', name: 'Quan Hoa', nameEn: 'Quan Hoa', fullName: 'Phường Quan Hoa', codeName: 'quan_hoa' },
                    { code: '00022', name: 'Dịch Vọng', nameEn: 'Dich Vong', fullName: 'Phường Dịch Vọng', codeName: 'dich_vong' },
                ]
            },
        ]
    },
    {
        code: '79',
        name: 'Hồ Chí Minh',
        nameEn: 'Ho Chi Minh',
        fullName: 'Thành phố Hồ Chí Minh',
        codeName: 'ho_chi_minh',
        districts: [
            {
                code: '760',
                name: 'Quận 1',
                nameEn: 'District 1',
                fullName: 'Quận 1',
                codeName: 'quan_1',
                wards: [
                    { code: '26743', name: 'Bến Nghé', nameEn: 'Ben Nghe', fullName: 'Phường Bến Nghé', codeName: 'ben_nghe' },
                    { code: '26746', name: 'Bến Thành', nameEn: 'Ben Thanh', fullName: 'Phường Bến Thành', codeName: 'ben_thanh' },
                    { code: '26749', name: 'Nguyễn Cư Trinh', nameEn: 'Nguyen Cu Trinh', fullName: 'Phường Nguyễn Cư Trinh', codeName: 'nguyen_cu_trinh' },
                ]
            },
            {
                code: '769',
                name: 'Quận 3',
                nameEn: 'District 3',
                fullName: 'Quận 3',
                codeName: 'quan_3',
                wards: [
                    { code: '26800', name: 'Võ Thị Sáu', nameEn: 'Vo Thi Sau', fullName: 'Phường Võ Thị Sáu', codeName: 'vo_thi_sau' },
                    { code: '26803', name: 'Phường 1', nameEn: 'Ward 1', fullName: 'Phường 1', codeName: 'phuong_1' },
                    { code: '26806', name: 'Phường 2', nameEn: 'Ward 2', fullName: 'Phường 2', codeName: 'phuong_2' },
                ]
            },
            {
                code: '773',
                name: 'Thủ Đức',
                nameEn: 'Thu Duc',
                fullName: 'Thành phố Thủ Đức',
                codeName: 'thu_duc',
                wards: [
                    { code: '26900', name: 'Linh Trung', nameEn: 'Linh Trung', fullName: 'Phường Linh Trung', codeName: 'linh_trung' },
                    { code: '26903', name: 'Linh Xuân', nameEn: 'Linh Xuan', fullName: 'Phường Linh Xuân', codeName: 'linh_xuan' },
                    { code: '26906', name: 'Hiệp Bình Chánh', nameEn: 'Hiep Binh Chanh', fullName: 'Phường Hiệp Bình Chánh', codeName: 'hiep_binh_chanh' },
                ]
            },
        ]
    },
    {
        code: '48',
        name: 'Đà Nẵng',
        nameEn: 'Da Nang',
        fullName: 'Thành phố Đà Nẵng',
        codeName: 'da_nang',
        districts: [
            {
                code: '490',
                name: 'Hải Châu',
                nameEn: 'Hai Chau',
                fullName: 'Quận Hải Châu',
                codeName: 'hai_chau',
                wards: [
                    { code: '20194', name: 'Thanh Bình', nameEn: 'Thanh Binh', fullName: 'Phường Thanh Bình', codeName: 'thanh_binh' },
                    { code: '20195', name: 'Thuận Phước', nameEn: 'Thuan Phuoc', fullName: 'Phường Thuận Phước', codeName: 'thuan_phuoc' },
                    { code: '20196', name: 'Thạch Thang', nameEn: 'Thach Thang', fullName: 'Phường Thạch Thang', codeName: 'thach_thang' },
                ]
            },
        ]
    },
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

    console.log('✅ Roles seeded successfully');
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

    console.log('✅ Member tiers seeded successfully');
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

    console.log('✅ Categories seeded successfully');
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

    console.log('✅ Brands seeded successfully');
}

async function seedProvinces() {
    console.log('🔄 Seeding provinces, districts, and wards...');

    for (const province of vietnamProvinces) {
        const createdProvince = await prisma.province.upsert({
            where: { code: province.code },
            update: {
                name: province.name,
                nameEn: province.nameEn,
                fullName: province.fullName,
                codeName: province.codeName,
            },
            create: {
                code: province.code,
                name: province.name,
                nameEn: province.nameEn,
                fullName: province.fullName,
                codeName: province.codeName,
            },
        });

        for (const district of province.districts) {
            const createdDistrict = await prisma.district.upsert({
                where: { code: district.code },
                update: {
                    name: district.name,
                    nameEn: district.nameEn,
                    fullName: district.fullName,
                    codeName: district.codeName,
                    provinceId: createdProvince.id,
                },
                create: {
                    code: district.code,
                    name: district.name,
                    nameEn: district.nameEn,
                    fullName: district.fullName,
                    codeName: district.codeName,
                    provinceId: createdProvince.id,
                },
            });

            for (const ward of district.wards) {
                await prisma.ward.upsert({
                    where: { code: ward.code },
                    update: {
                        name: ward.name,
                        nameEn: ward.nameEn,
                        fullName: ward.fullName,
                        codeName: ward.codeName,
                        districtId: createdDistrict.id,
                    },
                    create: {
                        code: ward.code,
                        name: ward.name,
                        nameEn: ward.nameEn,
                        fullName: ward.fullName,
                        codeName: ward.codeName,
                        districtId: createdDistrict.id,
                    },
                });
            }
        }
    }

    console.log('✅ Provinces seeded successfully');
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
        await seedProvinces();
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

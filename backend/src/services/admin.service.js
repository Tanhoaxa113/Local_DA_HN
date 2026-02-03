/**
 * Admin Service
 * Xử lý các chức năng quản trị, thống kê và báo cáo
 */
const prisma = require('../config/database');
const { OrderStatus } = require('../utils/orderStateMachine');

/**
 * Get dashboard statistics
 * Lấy thống kê Dashboard
 *
 * Chức năng: Tổng hợp các chỉ số quan trọng cho trang chủ Admin.
 * Luồng xử lý: Chạy song song (`Promise.all`) các query thống kê:
 * 1. Tổng doanh thu (chỉ tính đơn đã thanh toán).
 * 2. Doanh thu tháng này.
 * 3. Doanh thu hôm nay.
 * 4. Tổng số đơn hàng.
 * 5. Số đơn hàng chờ xử lý (Pending payment/confirmation/preparing).
 * 6. Khách hàng mới trong tháng.
 * 7. Sản phẩm sắp hết hàng (Low stock).
 * Kích hoạt khi: Admin vào Dashboard.
 * @returns {Promise<object>} Đối tượng chứa các số liệu thống kê.
 */
const getDashboardStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Run queries in parallel
    const [
        totalRevenue,
        monthlyRevenue,
        todayRevenue,
        totalOrders,
        pendingOrders,
        newUsers,
        lowStockCount,
    ] = await Promise.all([
        // Total revenue (paid orders)
        prisma.order.aggregate({
            _sum: { totalAmount: true },
            where: { paymentStatus: 'PAID' },
        }),
        // Monthly revenue
        prisma.order.aggregate({
            _sum: { totalAmount: true },
            where: {
                paymentStatus: 'PAID',
                createdAt: { gte: startOfMonth },
            },
        }),
        // Today's revenue
        prisma.order.aggregate({
            _sum: { totalAmount: true },
            where: {
                paymentStatus: 'PAID',
                createdAt: { gte: today },
            },
        }),
        // Total orders count
        prisma.order.count(),
        // Pending orders (requiring action)
        prisma.order.count({
            where: {
                status: {
                    in: [
                        OrderStatus.PENDING_PAYMENT,
                        OrderStatus.PENDING_CONFIRMATION,
                        OrderStatus.PREPARING,
                    ],
                },
            },
        }),
        // New users this month
        prisma.user.count({
            where: {
                createdAt: { gte: startOfMonth },
                role: { name: 'CUSTOMER' },
            },
        }),
        // Low stock variants
        prisma.productVariant.count({
            where: {
                stock: {
                    lte: prisma.productVariant.fields.lowStockThreshold,
                },
                isActive: true,
            },
        }),
    ]);

    return {
        revenue: {
            total: totalRevenue._sum.totalAmount || 0,
            monthly: monthlyRevenue._sum.totalAmount || 0,
            today: todayRevenue._sum.totalAmount || 0,
        },
        orders: {
            total: totalOrders,
            pending: pendingOrders,
        },
        users: {
            newThisMonth: newUsers,
        },
        inventory: {
            lowStock: lowStockCount,
        },
    };
};

/**
 * Get revenue chart data
 * Lấy dữ liệu biểu đồ doanh thu
 *
 * Chức năng: Trả về dữ liệu để vẽ biểu đồ doanh thu theo thời gian.
 * Luồng xử lý:
 * 1. Xác định khoảng thời gian (tuần/tháng/năm) dựa vào tham số `period`.
 * 2. Query lấy tất cả đơn hàng đã thanh toán trong khoảng đó.
 * 3. Group dữ liệu bằng JS (do Prisma giới hạn group by date check chéo DB):
 *    - Tạo map chứa tất cả các ngày/tháng trong range (để biểu đồ không bị đứt đoạn những ngày không có đơn).
 *    - Cộng dồn doanh thu vào từng ngày/tháng tương ứng.
 * 4. Chuyển đổi thành mảng object để Frontend dễ vẽ.
 * Kích hoạt khi: Admin xem biểu đồ doanh thu.
 * @param {string} period - Khoảng thời gian: 'week' | 'month' | 'year'.
 * @returns {Promise<object[]>} Mảng dữ liệu báo cáo.
 */
const getRevenueChart = async (period = 'week') => {
    const now = new Date();
    let startDate;
    let groupByFormat;

    // Define query range
    switch (period) {
        case 'week':
            // Last 7 days
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'month':
            // Last 30 days
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 29);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'year':
            // Last 12 months
            startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
            break;
        default:
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 6);
    }

    // Since Prisma doesn't support advanced Date grouping easily across DBs,
    // we fetch raw data and group in JS (for simpler implementation)
    // For large datasets, use raw SQL: prisma.$queryRaw
    const orders = await prisma.order.findMany({
        where: {
            createdAt: { gte: startDate },
            paymentStatus: 'PAID',
        },
        select: {
            createdAt: true,
            totalAmount: true,
        },
        orderBy: { createdAt: 'asc' },
    });

    // Grouping logic
    const groupedData = {};

    // Initialize map with all dates/months in range to ensure continuity
    if (period === 'year') {
        for (let i = 0; i < 12; i++) {
            const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
            groupedData[key] = 0;
        }
    } else {
        const days = period === 'week' ? 7 : 30;
        for (let i = 0; i < days; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
            groupedData[key] = 0;
        }
    }

    // Aggregate values
    orders.forEach(order => {
        let key;
        const d = new Date(order.createdAt);
        if (period === 'year') {
            key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        } else {
            key = d.toISOString().split('T')[0];
        }

        if (groupedData[key] !== undefined) {
            groupedData[key] += Number(order.totalAmount);
        }
    });

    // Convert to array
    return Object.entries(groupedData).map(([date, amount]) => ({
        date,
        amount,
    }));
};

/**
 * Get top selling products
 * Lấy top sản phẩm bán chạy
 *
 * Chức năng: Thống kê các sản phẩm bán tốt nhất.
 * Luồng xử lý:
 * 1. Group table `OrderItem` theo biến thể sản phẩm.
 * 2. Tính tổng số lượng bán và tổng doanh thu.
 * 3. Sắp xếp giảm dần theo số lượng.
 * 4. Lấy `limit` kết quả đầu tiên.
 * Kích hoạt khi: Admin xem mục "Top sản phẩm".
 * @param {number} limit - Số lượng kết quả muốn lấy.
 * @returns {Promise<object[]>} Danh sách sản phẩm top.
 */
const getTopProducts = async (limit = 5) => {
    // This requires aggregation on OrderItem
    const topVariants = await prisma.orderItem.groupBy({
        by: ['variantId', 'productName'],
        _sum: {
            quantity: true,
            totalPrice: true,
        },
        orderBy: {
            _sum: { quantity: 'desc' },
        },
        take: limit,
    });

    return topVariants.map(item => ({
        name: item.productName,
        variantId: item.variantId,
        sold: item._sum.quantity,
        revenue: item._sum.totalPrice,
    }));
};

/**
 * Get recent activity
 * Lấy hoạt động gần đây
 *
 * Chức năng: Liệt kê các đơn hàng mới nhất (có thể mở rộng thêm user mới, review mới...).
 * Luồng xử lý: Lấy danh sách Order mới nhất, sắp xếp theo `createdAt` giảm dần.
 * Kích hoạt khi: Widget "Hoạt động gần đây" trên Dashboard.
 * @param {number} limit - Số dòng muốn lấy.
 * @returns {Promise<object[]>} Danh sách hoạt động.
 */
const getRecentActivity = async (limit = 10) => {
    // Combine recent orders and user registrations
    const recentOrders = await prisma.order.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { fullName: true } } },
    });

    return recentOrders.map(order => ({
        type: 'ORDER',
        id: order.id,
        description: `New order #${order.orderNumber} by ${order.user.fullName}`,
        amount: order.totalAmount,
        status: order.status,
        timestamp: order.createdAt,
    }));
};

module.exports = {
    getDashboardStats,
    getRevenueChart,
    getTopProducts,
    getRecentActivity,
};

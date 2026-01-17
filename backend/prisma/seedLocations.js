/**
 * Location Data Seeder
 * Fetches and seeds Vietnam provinces, districts, and wards
 * Data source: https://provinces.open-api.vn/
 */
const prisma = require('../src/config/database');

// Vietnam location data - Major provinces for initial seeding
// Full data can be fetched from https://provinces.open-api.vn/api/?depth=3
const LOCATION_DATA = [
    {
        code: "01",
        name: "Hà Nội",
        fullName: "Thành phố Hà Nội",
        codeName: "ha_noi",
        districts: [
            {
                code: "001",
                name: "Ba Đình",
                fullName: "Quận Ba Đình",
                codeName: "ba_dinh",
                wards: [
                    { code: "00001", name: "Phúc Xá", fullName: "Phường Phúc Xá" },
                    { code: "00004", name: "Trúc Bạch", fullName: "Phường Trúc Bạch" },
                    { code: "00006", name: "Vĩnh Phúc", fullName: "Phường Vĩnh Phúc" },
                    { code: "00007", name: "Cống Vị", fullName: "Phường Cống Vị" },
                    { code: "00008", name: "Liễu Giai", fullName: "Phường Liễu Giai" },
                    { code: "00010", name: "Nguyễn Trung Trực", fullName: "Phường Nguyễn Trung Trực" },
                    { code: "00013", name: "Quán Thánh", fullName: "Phường Quán Thánh" },
                    { code: "00016", name: "Ngọc Hà", fullName: "Phường Ngọc Hà" },
                    { code: "00019", name: "Điện Biên", fullName: "Phường Điện Biên" },
                    { code: "00022", name: "Đội Cấn", fullName: "Phường Đội Cấn" },
                    { code: "00025", name: "Ngọc Khánh", fullName: "Phường Ngọc Khánh" },
                    { code: "00028", name: "Kim Mã", fullName: "Phường Kim Mã" },
                    { code: "00031", name: "Giảng Võ", fullName: "Phường Giảng Võ" },
                    { code: "00034", name: "Thành Công", fullName: "Phường Thành Công" },
                ]
            },
            {
                code: "002",
                name: "Hoàn Kiếm",
                fullName: "Quận Hoàn Kiếm",
                codeName: "hoan_kiem",
                wards: [
                    { code: "00037", name: "Phúc Tân", fullName: "Phường Phúc Tân" },
                    { code: "00040", name: "Đồng Xuân", fullName: "Phường Đồng Xuân" },
                    { code: "00043", name: "Hàng Mã", fullName: "Phường Hàng Mã" },
                    { code: "00046", name: "Hàng Buồm", fullName: "Phường Hàng Buồm" },
                    { code: "00049", name: "Hàng Đào", fullName: "Phường Hàng Đào" },
                    { code: "00052", name: "Hàng Bồ", fullName: "Phường Hàng Bồ" },
                    { code: "00055", name: "Cửa Đông", fullName: "Phường Cửa Đông" },
                    { code: "00058", name: "Lý Thái Tổ", fullName: "Phường Lý Thái Tổ" },
                    { code: "00061", name: "Hàng Bạc", fullName: "Phường Hàng Bạc" },
                    { code: "00064", name: "Hàng Gai", fullName: "Phường Hàng Gai" },
                    { code: "00067", name: "Chương Dương", fullName: "Phường Chương Dương" },
                    { code: "00070", name: "Hàng Trống", fullName: "Phường Hàng Trống" },
                    { code: "00073", name: "Cửa Nam", fullName: "Phường Cửa Nam" },
                    { code: "00076", name: "Hàng Bông", fullName: "Phường Hàng Bông" },
                    { code: "00079", name: "Tràng Tiền", fullName: "Phường Tràng Tiền" },
                    { code: "00082", name: "Trần Hưng Đạo", fullName: "Phường Trần Hưng Đạo" },
                    { code: "00085", name: "Phan Chu Trinh", fullName: "Phường Phan Chu Trinh" },
                    { code: "00088", name: "Hàng Bài", fullName: "Phường Hàng Bài" },
                ]
            },
            {
                code: "003",
                name: "Tây Hồ",
                fullName: "Quận Tây Hồ",
                codeName: "tay_ho",
                wards: [
                    { code: "00091", name: "Phú Thượng", fullName: "Phường Phú Thượng" },
                    { code: "00094", name: "Nhật Tân", fullName: "Phường Nhật Tân" },
                    { code: "00097", name: "Tứ Liên", fullName: "Phường Tứ Liên" },
                    { code: "00100", name: "Quảng An", fullName: "Phường Quảng An" },
                    { code: "00103", name: "Xuân La", fullName: "Phường Xuân La" },
                    { code: "00106", name: "Yên Phụ", fullName: "Phường Yên Phụ" },
                    { code: "00109", name: "Bưởi", fullName: "Phường Bưởi" },
                    { code: "00112", name: "Thụy Khuê", fullName: "Phường Thụy Khuê" },
                ]
            },
            {
                code: "006",
                name: "Cầu Giấy",
                fullName: "Quận Cầu Giấy",
                codeName: "cau_giay",
                wards: [
                    { code: "00178", name: "Nghĩa Đô", fullName: "Phường Nghĩa Đô" },
                    { code: "00181", name: "Nghĩa Tân", fullName: "Phường Nghĩa Tân" },
                    { code: "00184", name: "Mai Dịch", fullName: "Phường Mai Dịch" },
                    { code: "00187", name: "Dịch Vọng", fullName: "Phường Dịch Vọng" },
                    { code: "00190", name: "Dịch Vọng Hậu", fullName: "Phường Dịch Vọng Hậu" },
                    { code: "00193", name: "Quan Hoa", fullName: "Phường Quan Hoa" },
                    { code: "00196", name: "Yên Hoà", fullName: "Phường Yên Hoà" },
                    { code: "00199", name: "Trung Hoà", fullName: "Phường Trung Hoà" },
                ]
            },
            {
                code: "007",
                name: "Đống Đa",
                fullName: "Quận Đống Đa",
                codeName: "dong_da",
                wards: [
                    { code: "00202", name: "Cát Linh", fullName: "Phường Cát Linh" },
                    { code: "00205", name: "Văn Miếu", fullName: "Phường Văn Miếu" },
                    { code: "00208", name: "Quốc Tử Giám", fullName: "Phường Quốc Tử Giám" },
                    { code: "00211", name: "Láng Thượng", fullName: "Phường Láng Thượng" },
                    { code: "00214", name: "Ô Chợ Dừa", fullName: "Phường Ô Chợ Dừa" },
                    { code: "00217", name: "Văn Chương", fullName: "Phường Văn Chương" },
                    { code: "00220", name: "Hàng Bột", fullName: "Phường Hàng Bột" },
                    { code: "00223", name: "Láng Hạ", fullName: "Phường Láng Hạ" },
                    { code: "00226", name: "Khâm Thiên", fullName: "Phường Khâm Thiên" },
                    { code: "00229", name: "Thổ Quan", fullName: "Phường Thổ Quan" },
                    { code: "00232", name: "Nam Đồng", fullName: "Phường Nam Đồng" },
                    { code: "00235", name: "Trung Phụng", fullName: "Phường Trung Phụng" },
                    { code: "00238", name: "Quang Trung", fullName: "Phường Quang Trung" },
                    { code: "00241", name: "Trung Liệt", fullName: "Phường Trung Liệt" },
                    { code: "00244", name: "Phương Liên", fullName: "Phường Phương Liên" },
                    { code: "00247", name: "Thịnh Quang", fullName: "Phường Thịnh Quang" },
                    { code: "00250", name: "Trung Tự", fullName: "Phường Trung Tự" },
                    { code: "00253", name: "Kim Liên", fullName: "Phường Kim Liên" },
                    { code: "00256", name: "Phương Mai", fullName: "Phường Phương Mai" },
                    { code: "00259", name: "Ngã Tư Sở", fullName: "Phường Ngã Tư Sở" },
                    { code: "00262", name: "Khương Thượng", fullName: "Phường Khương Thượng" },
                ]
            },
        ]
    },
    {
        code: "79",
        name: "Hồ Chí Minh",
        fullName: "Thành phố Hồ Chí Minh",
        codeName: "ho_chi_minh",
        districts: [
            {
                code: "760",
                name: "Quận 1",
                fullName: "Quận 1",
                codeName: "quan_1",
                wards: [
                    { code: "26734", name: "Tân Định", fullName: "Phường Tân Định" },
                    { code: "26737", name: "Đa Kao", fullName: "Phường Đa Kao" },
                    { code: "26740", name: "Bến Nghé", fullName: "Phường Bến Nghé" },
                    { code: "26743", name: "Bến Thành", fullName: "Phường Bến Thành" },
                    { code: "26746", name: "Nguyễn Thái Bình", fullName: "Phường Nguyễn Thái Bình" },
                    { code: "26749", name: "Phạm Ngũ Lão", fullName: "Phường Phạm Ngũ Lão" },
                    { code: "26752", name: "Cầu Ông Lãnh", fullName: "Phường Cầu Ông Lãnh" },
                    { code: "26755", name: "Cô Giang", fullName: "Phường Cô Giang" },
                    { code: "26758", name: "Nguyễn Cư Trinh", fullName: "Phường Nguyễn Cư Trinh" },
                    { code: "26761", name: "Cầu Kho", fullName: "Phường Cầu Kho" },
                ]
            },
            {
                code: "769",
                name: "Quận 3",
                fullName: "Quận 3",
                codeName: "quan_3",
                wards: [
                    { code: "27082", name: "Phường 1", fullName: "Phường 1" },
                    { code: "27085", name: "Phường 2", fullName: "Phường 2" },
                    { code: "27088", name: "Phường 3", fullName: "Phường 3" },
                    { code: "27091", name: "Phường 4", fullName: "Phường 4" },
                    { code: "27094", name: "Phường 5", fullName: "Phường 5" },
                    { code: "27100", name: "Phường 9", fullName: "Phường 9" },
                    { code: "27103", name: "Phường 10", fullName: "Phường 10" },
                    { code: "27106", name: "Phường 11", fullName: "Phường 11" },
                    { code: "27109", name: "Phường 12", fullName: "Phường 12" },
                    { code: "27112", name: "Phường 13", fullName: "Phường 13" },
                    { code: "27115", name: "Phường 14", fullName: "Phường 14" },
                    { code: "27118", name: "Võ Thị Sáu", fullName: "Phường Võ Thị Sáu" },
                ]
            },
            {
                code: "770",
                name: "Quận 5",
                fullName: "Quận 5",
                codeName: "quan_5",
                wards: [
                    { code: "27124", name: "Phường 1", fullName: "Phường 1" },
                    { code: "27127", name: "Phường 2", fullName: "Phường 2" },
                    { code: "27130", name: "Phường 3", fullName: "Phường 3" },
                    { code: "27133", name: "Phường 4", fullName: "Phường 4" },
                    { code: "27136", name: "Phường 5", fullName: "Phường 5" },
                    { code: "27139", name: "Phường 6", fullName: "Phường 6" },
                    { code: "27142", name: "Phường 7", fullName: "Phường 7" },
                    { code: "27145", name: "Phường 8", fullName: "Phường 8" },
                    { code: "27148", name: "Phường 9", fullName: "Phường 9" },
                    { code: "27151", name: "Phường 10", fullName: "Phường 10" },
                    { code: "27154", name: "Phường 11", fullName: "Phường 11" },
                    { code: "27157", name: "Phường 12", fullName: "Phường 12" },
                    { code: "27160", name: "Phường 13", fullName: "Phường 13" },
                    { code: "27163", name: "Phường 14", fullName: "Phường 14" },
                ]
            },
            {
                code: "771",
                name: "Quận 7",
                fullName: "Quận 7",
                codeName: "quan_7",
                wards: [
                    { code: "27169", name: "Tân Thuận Đông", fullName: "Phường Tân Thuận Đông" },
                    { code: "27172", name: "Tân Thuận Tây", fullName: "Phường Tân Thuận Tây" },
                    { code: "27175", name: "Tân Kiểng", fullName: "Phường Tân Kiểng" },
                    { code: "27178", name: "Tân Hưng", fullName: "Phường Tân Hưng" },
                    { code: "27181", name: "Bình Thuận", fullName: "Phường Bình Thuận" },
                    { code: "27184", name: "Tân Quy", fullName: "Phường Tân Quy" },
                    { code: "27187", name: "Phú Thuận", fullName: "Phường Phú Thuận" },
                    { code: "27190", name: "Tân Phú", fullName: "Phường Tân Phú" },
                    { code: "27193", name: "Tân Phong", fullName: "Phường Tân Phong" },
                    { code: "27196", name: "Phú Mỹ", fullName: "Phường Phú Mỹ" },
                ]
            },
            {
                code: "764",
                name: "Bình Thạnh",
                fullName: "Quận Bình Thạnh",
                codeName: "binh_thanh",
                wards: [
                    { code: "26818", name: "Phường 1", fullName: "Phường 1" },
                    { code: "26821", name: "Phường 2", fullName: "Phường 2" },
                    { code: "26824", name: "Phường 3", fullName: "Phường 3" },
                    { code: "26830", name: "Phường 5", fullName: "Phường 5" },
                    { code: "26833", name: "Phường 6", fullName: "Phường 6" },
                    { code: "26836", name: "Phường 7", fullName: "Phường 7" },
                    { code: "26848", name: "Phường 11", fullName: "Phường 11" },
                    { code: "26851", name: "Phường 12", fullName: "Phường 12" },
                    { code: "26854", name: "Phường 13", fullName: "Phường 13" },
                    { code: "26857", name: "Phường 14", fullName: "Phường 14" },
                    { code: "26860", name: "Phường 15", fullName: "Phường 15" },
                    { code: "26866", name: "Phường 17", fullName: "Phường 17" },
                    { code: "26872", name: "Phường 19", fullName: "Phường 19" },
                    { code: "26878", name: "Phường 21", fullName: "Phường 21" },
                    { code: "26881", name: "Phường 22", fullName: "Phường 22" },
                    { code: "26887", name: "Phường 24", fullName: "Phường 24" },
                    { code: "26890", name: "Phường 25", fullName: "Phường 25" },
                    { code: "26893", name: "Phường 26", fullName: "Phường 26" },
                    { code: "26896", name: "Phường 27", fullName: "Phường 27" },
                    { code: "26899", name: "Phường 28", fullName: "Phường 28" },
                ]
            },
            {
                code: "765",
                name: "Thủ Đức",
                fullName: "Thành phố Thủ Đức",
                codeName: "thu_duc",
                wards: [
                    { code: "26902", name: "Linh Xuân", fullName: "Phường Linh Xuân" },
                    { code: "26905", name: "Bình Chiểu", fullName: "Phường Bình Chiểu" },
                    { code: "26908", name: "Linh Trung", fullName: "Phường Linh Trung" },
                    { code: "26911", name: "Tam Bình", fullName: "Phường Tam Bình" },
                    { code: "26914", name: "Tam Phú", fullName: "Phường Tam Phú" },
                    { code: "26917", name: "Hiệp Bình Phước", fullName: "Phường Hiệp Bình Phước" },
                    { code: "26920", name: "Hiệp Bình Chánh", fullName: "Phường Hiệp Bình Chánh" },
                    { code: "26923", name: "Linh Chiểu", fullName: "Phường Linh Chiểu" },
                    { code: "26926", name: "Linh Tây", fullName: "Phường Linh Tây" },
                    { code: "26929", name: "Linh Đông", fullName: "Phường Linh Đông" },
                    { code: "26932", name: "Bình Thọ", fullName: "Phường Bình Thọ" },
                    { code: "26935", name: "Trường Thọ", fullName: "Phường Trường Thọ" },
                ]
            },
        ]
    },
    {
        code: "48",
        name: "Đà Nẵng",
        fullName: "Thành phố Đà Nẵng",
        codeName: "da_nang",
        districts: [
            {
                code: "490",
                name: "Hải Châu",
                fullName: "Quận Hải Châu",
                codeName: "hai_chau",
                wards: [
                    { code: "20194", name: "Thanh Bình", fullName: "Phường Thanh Bình" },
                    { code: "20195", name: "Thuận Phước", fullName: "Phường Thuận Phước" },
                    { code: "20197", name: "Thạch Thang", fullName: "Phường Thạch Thang" },
                    { code: "20198", name: "Hải Châu I", fullName: "Phường Hải Châu I" },
                    { code: "20200", name: "Hải Châu II", fullName: "Phường Hải Châu II" },
                    { code: "20203", name: "Phước Ninh", fullName: "Phường Phước Ninh" },
                    { code: "20206", name: "Hoà Thuận Tây", fullName: "Phường Hoà Thuận Tây" },
                    { code: "20207", name: "Hoà Thuận Đông", fullName: "Phường Hoà Thuận Đông" },
                    { code: "20209", name: "Nam Dương", fullName: "Phường Nam Dương" },
                    { code: "20212", name: "Bình Hiên", fullName: "Phường Bình Hiên" },
                    { code: "20215", name: "Bình Thuận", fullName: "Phường Bình Thuận" },
                    { code: "20218", name: "Hoà Cường Bắc", fullName: "Phường Hoà Cường Bắc" },
                    { code: "20221", name: "Hoà Cường Nam", fullName: "Phường Hoà Cường Nam" },
                ]
            },
            {
                code: "491",
                name: "Sơn Trà",
                fullName: "Quận Sơn Trà",
                codeName: "son_tra",
                wards: [
                    { code: "20224", name: "Thọ Quang", fullName: "Phường Thọ Quang" },
                    { code: "20225", name: "Nại Hiên Đông", fullName: "Phường Nại Hiên Đông" },
                    { code: "20227", name: "Mân Thái", fullName: "Phường Mân Thái" },
                    { code: "20230", name: "An Hải Bắc", fullName: "Phường An Hải Bắc" },
                    { code: "20233", name: "Phước Mỹ", fullName: "Phường Phước Mỹ" },
                    { code: "20236", name: "An Hải Tây", fullName: "Phường An Hải Tây" },
                    { code: "20239", name: "An Hải Đông", fullName: "Phường An Hải Đông" },
                ]
            },
            {
                code: "492",
                name: "Ngũ Hành Sơn",
                fullName: "Quận Ngũ Hành Sơn",
                codeName: "ngu_hanh_son",
                wards: [
                    { code: "20242", name: "Mỹ An", fullName: "Phường Mỹ An" },
                    { code: "20245", name: "Khuê Mỹ", fullName: "Phường Khuê Mỹ" },
                    { code: "20246", name: "Hoà Quý", fullName: "Phường Hoà Quý" },
                    { code: "20248", name: "Hoà Hải", fullName: "Phường Hoà Hải" },
                ]
            },
        ]
    },
];

/**
 * Seed location data
 */
const seedLocations = async () => {
    console.log('🌍 Seeding location data...');

    for (const province of LOCATION_DATA) {
        // Create province
        const createdProvince = await prisma.province.upsert({
            where: { code: province.code },
            update: {
                name: province.name,
                fullName: province.fullName,
                codeName: province.codeName,
            },
            create: {
                code: province.code,
                name: province.name,
                fullName: province.fullName,
                codeName: province.codeName,
            },
        });

        console.log(`  ✓ Province: ${province.name}`);

        // Create districts
        for (const district of province.districts) {
            const createdDistrict = await prisma.district.upsert({
                where: { code: district.code },
                update: {
                    name: district.name,
                    fullName: district.fullName,
                    codeName: district.codeName,
                    provinceId: createdProvince.id,
                },
                create: {
                    code: district.code,
                    name: district.name,
                    fullName: district.fullName,
                    codeName: district.codeName,
                    provinceId: createdProvince.id,
                },
            });

            // Create wards
            for (const ward of district.wards) {
                await prisma.ward.upsert({
                    where: { code: ward.code },
                    update: {
                        name: ward.name,
                        fullName: ward.fullName,
                        districtId: createdDistrict.id,
                    },
                    create: {
                        code: ward.code,
                        name: ward.name,
                        fullName: ward.fullName,
                        districtId: createdDistrict.id,
                    },
                });
            }

            console.log(`    ✓ District: ${district.name} (${district.wards.length} wards)`);
        }
    }

    console.log('✅ Location data seeded successfully!');
};

module.exports = { seedLocations, LOCATION_DATA };

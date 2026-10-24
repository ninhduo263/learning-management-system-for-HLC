/**
 * 34 đơn vị hành chính cấp tỉnh sau sáp nhập (Nghị quyết 202/2025/QH15, hiệu lực 12/6/2025).
 * aliases: tên tỉnh cũ đã sáp nhập và cách viết khác, dùng để quy đổi dữ liệu nhập tự do.
 */
export const PROVINCES: { code: string; name: string; aliases: string[] }[] = [
    {
        code: "HA_NOI",
        name: "Thành phố Hà Nội",
        aliases: ["Hà Nội", "Ha Noi", "HN", "Hanoi", "Hà Tây"],
    },
    {
        code: "HUE",
        name: "Thành phố Huế",
        aliases: [
            "Huế",
            "Thừa Thiên Huế",
            "Thừa Thiên - Huế",
            "TT Huế",
            "TT-Huế",
        ],
    },
    {
        code: "HAI_PHONG",
        name: "Thành phố Hải Phòng",
        aliases: ["Hải Phòng", "HP", "Hải Dương"],
    },
    {
        code: "DA_NANG",
        name: "Thành phố Đà Nẵng",
        aliases: ["Đà Nẵng", "Da Nang", "ĐN", "Quảng Nam"],
    },
    {
        code: "HO_CHI_MINH",
        name: "Thành phố Hồ Chí Minh",
        aliases: [
            "Hồ Chí Minh",
            "TP HCM",
            "TPHCM",
            "TP.HCM",
            "HCM",
            "Sài Gòn",
            "Saigon",
            "Ho Chi Minh",
            "Bình Dương",
            "Bà Rịa - Vũng Tàu",
            "Bà Rịa Vũng Tàu",
            "Vũng Tàu",
            "BRVT",
        ],
    },
    {
        code: "CAN_THO",
        name: "Thành phố Cần Thơ",
        aliases: ["Cần Thơ", "Can Tho", "Sóc Trăng", "Hậu Giang"],
    },
    {
        code: "TUYEN_QUANG",
        name: "Tỉnh Tuyên Quang",
        aliases: ["Tuyên Quang", "Hà Giang"],
    },
    { code: "CAO_BANG", name: "Tỉnh Cao Bằng", aliases: ["Cao Bằng"] },
    { code: "LAI_CHAU", name: "Tỉnh Lai Châu", aliases: ["Lai Châu"] },
    { code: "LAO_CAI", name: "Tỉnh Lào Cai", aliases: ["Lào Cai", "Yên Bái"] },
    {
        code: "THAI_NGUYEN",
        name: "Tỉnh Thái Nguyên",
        aliases: ["Thái Nguyên", "Bắc Kạn", "Bắc Cạn"],
    },
    { code: "DIEN_BIEN", name: "Tỉnh Điện Biên", aliases: ["Điện Biên"] },
    { code: "LANG_SON", name: "Tỉnh Lạng Sơn", aliases: ["Lạng Sơn"] },
    { code: "SON_LA", name: "Tỉnh Sơn La", aliases: ["Sơn La"] },
    {
        code: "PHU_THO",
        name: "Tỉnh Phú Thọ",
        aliases: ["Phú Thọ", "Vĩnh Phúc", "Hòa Bình", "Hoà Bình"],
    },
    {
        code: "BAC_NINH",
        name: "Tỉnh Bắc Ninh",
        aliases: ["Bắc Ninh", "Bắc Giang"],
    },
    { code: "QUANG_NINH", name: "Tỉnh Quảng Ninh", aliases: ["Quảng Ninh"] },
    {
        code: "HUNG_YEN",
        name: "Tỉnh Hưng Yên",
        aliases: ["Hưng Yên", "Thái Bình"],
    },
    {
        code: "NINH_BINH",
        name: "Tỉnh Ninh Bình",
        aliases: ["Ninh Bình", "Hà Nam", "Nam Định"],
    },
    {
        code: "THANH_HOA",
        name: "Tỉnh Thanh Hóa",
        aliases: ["Thanh Hóa", "Thanh Hoá"],
    },
    { code: "NGHE_AN", name: "Tỉnh Nghệ An", aliases: ["Nghệ An"] },
    { code: "HA_TINH", name: "Tỉnh Hà Tĩnh", aliases: ["Hà Tĩnh"] },
    {
        code: "QUANG_TRI",
        name: "Tỉnh Quảng Trị",
        aliases: ["Quảng Trị", "Quảng Bình"],
    },
    {
        code: "QUANG_NGAI",
        name: "Tỉnh Quảng Ngãi",
        aliases: ["Quảng Ngãi", "Kon Tum", "Kontum"],
    },
    {
        code: "GIA_LAI",
        name: "Tỉnh Gia Lai",
        aliases: ["Gia Lai", "Bình Định"],
    },
    {
        code: "KHANH_HOA",
        name: "Tỉnh Khánh Hòa",
        aliases: ["Khánh Hòa", "Khánh Hoà", "Nha Trang", "Ninh Thuận"],
    },
    {
        code: "LAM_DONG",
        name: "Tỉnh Lâm Đồng",
        aliases: [
            "Lâm Đồng",
            "Đà Lạt",
            "Đắk Nông",
            "Đăk Nông",
            "Dak Nong",
            "Bình Thuận",
        ],
    },
    {
        code: "DAK_LAK",
        name: "Tỉnh Đắk Lắk",
        aliases: ["Đắk Lắk", "Đăk Lăk", "Dak Lak", "Daklak", "Phú Yên"],
    },
    {
        code: "DONG_NAI",
        name: "Tỉnh Đồng Nai",
        aliases: ["Đồng Nai", "Biên Hòa", "Bình Phước"],
    },
    {
        code: "TAY_NINH",
        name: "Tỉnh Tây Ninh",
        aliases: ["Tây Ninh", "Long An"],
    },
    {
        code: "VINH_LONG",
        name: "Tỉnh Vĩnh Long",
        aliases: ["Vĩnh Long", "Bến Tre", "Trà Vinh"],
    },
    {
        code: "DONG_THAP",
        name: "Tỉnh Đồng Tháp",
        aliases: ["Đồng Tháp", "Tiền Giang"],
    },
    { code: "CA_MAU", name: "Tỉnh Cà Mau", aliases: ["Cà Mau", "Bạc Liêu"] },
    {
        code: "AN_GIANG",
        name: "Tỉnh An Giang",
        aliases: ["An Giang", "Kiên Giang", "Phú Quốc"],
    },
];

/** Bỏ dấu, chữ thường, bỏ tiền tố "tỉnh / thành phố / tp" để so khớp */
export function normalizePlace(value: string) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .replace(/\b(tinh|thanh pho|tp\.?)\s+/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

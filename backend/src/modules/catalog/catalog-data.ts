/** 38 nhóm ngành nghề (danh sách đã chốt) - dùng cho ngành học và ngành nghề, chọn nhiều */
export const CAREERS: { code: string; name: string; aliases?: string[] }[] = [
    {
        code: "AN_NINH",
        name: "An ninh/Quốc phòng/Quân sự",
        aliases: ["Công an", "Quân đội"],
    },
    {
        code: "BAO_CHI",
        name: "Báo chí/Quan hệ công chúng",
        aliases: ["PR", "Phóng viên", "Nhà báo"],
    },
    { code: "IN_AN", name: "In ấn/Xuất bản/Thông tin", aliases: ["Thư viện"] },
    {
        code: "TRUYEN_THONG",
        name: "Truyền thông/Sự kiện/Multimedia",
        aliases: ["Media", "Event", "Đa phương tiện"],
    },
    {
        code: "GIAO_DUC",
        name: "Giáo dục/Đào tạo/Sư phạm",
        aliases: ["Giáo viên", "Giảng viên"],
    },
    {
        code: "NHAN_HOC",
        name: "Nhân học/Lịch sử/Văn hóa",
        aliases: ["Văn hóa học"],
    },
    { code: "TAM_LY", name: "Tâm lý học/Công tác Xã hội", aliases: ["Tâm lý"] },
    { code: "TON_GIAO", name: "Tôn giáo/Huyền học/Thần học" },
    {
        code: "TRIET_HOC",
        name: "Triết học/Xã hội học/Chính trị",
        aliases: ["Chính trị học"],
    },
    {
        code: "LUAT",
        name: "Luật/Tư pháp/Hành chính",
        aliases: ["Luật sư", "Pháp luật", "Luật kinh tế"],
    },
    {
        code: "NGON_NGU",
        name: "Ngôn ngữ/Văn hóa Quốc tế",
        aliases: ["Ngôn ngữ Anh", "Tiếng Anh", "Biên phiên dịch", "Ngoại ngữ"],
    },
    {
        code: "NGOAI_GIAO",
        name: "Ngoại giao/Quan hệ Quốc tế",
        aliases: ["Quan hệ quốc tế"],
    },
    {
        code: "CNTT",
        name: "Công nghệ Thông tin/Máy tính",
        aliases: [
            "CNTT",
            "IT",
            "Khoa học máy tính",
            "Kỹ thuật phần mềm",
            "Lập trình",
            "Kỹ sư phần mềm",
            "An toàn thông tin",
            "Hệ thống thông tin",
        ],
    },
    {
        code: "DIEN_TU",
        name: "Điện/Điện tử Viễn thông",
        aliases: ["Điện tử", "Viễn thông", "Kỹ thuật điện"],
    },
    { code: "KHI_TUONG", name: "Khí tượng/Thủy văn/Hải dương" },
    {
        code: "KHOA_HOC_TU_NHIEN",
        name: "Khoa học Tự nhiên/Môi trường",
        aliases: ["Toán học", "Vật lý", "Hóa học", "Sinh học", "Môi trường"],
    },
    {
        code: "NANG_LUONG",
        name: "Năng lượng/Vật liệu mới",
        aliases: ["Vật liệu"],
    },
    {
        code: "TAI_NGUYEN",
        name: "Tài nguyên/Khoáng sản/Địa chất",
        aliases: ["Địa chất", "Mỏ"],
    },
    {
        code: "KE_TOAN",
        name: "Kế toán/Kiểm toán/Thống kê",
        aliases: ["Kế toán", "Kiểm toán"],
    },
    {
        code: "QUAN_TRI",
        name: "Quản trị Kinh doanh/Nhân sự",
        aliases: ["Quản trị kinh doanh", "QTKD", "Nhân sự", "HR"],
    },
    {
        code: "TAI_CHINH",
        name: "Tài chính/Ngân hàng/Bảo hiểm",
        aliases: ["Tài chính ngân hàng", "Ngân hàng", "Bảo hiểm", "Kinh tế"],
    },
    {
        code: "THUONG_MAI",
        name: "Thương mại/Marketing/Bán hàng",
        aliases: ["Marketing", "Kinh doanh", "Sales", "Thương mại điện tử"],
    },
    {
        code: "LOGISTICS",
        name: "Giao thông/Vận tải/Logistics",
        aliases: ["Logistics", "Vận tải", "Xuất nhập khẩu"],
    },
    {
        code: "DO_THI",
        name: "Quản lý Đô thị/Bất động sản",
        aliases: ["Bất động sản"],
    },
    {
        code: "XAY_DUNG",
        name: "Xây dựng/Kiến trúc/Quy hoạch",
        aliases: ["Kiến trúc", "Xây dựng"],
    },
    {
        code: "DINH_DUONG",
        name: "Dinh dưỡng/Trị liệu/Sức khỏe",
        aliases: ["Dinh dưỡng", "Vật lý trị liệu"],
    },
    { code: "Y_HOC_CO_TRUYEN", name: "Y học Cổ truyền/Dược liệu" },
    {
        code: "Y_TE",
        name: "Y tế/Dược học/Điều dưỡng",
        aliases: ["Y khoa", "Bác sĩ", "Dược", "Điều dưỡng", "Y đa khoa"],
    },
    { code: "THAM_MY", name: "Thẩm mỹ/Spa/Làm đẹp" },
    {
        code: "THE_THAO",
        name: "Thể dục/Thể thao/Giải trí",
        aliases: ["Thể thao"],
    },
    {
        code: "AM_NHAC",
        name: "Âm nhạc/Sân khấu/Biểu diễn",
        aliases: ["Âm nhạc"],
    },
    {
        code: "NOI_DUNG_SO",
        name: "Công nghiệp Giải trí/Nội dung số",
        aliases: ["Game", "Nội dung số", "Content"],
    },
    {
        code: "HOI_HOA",
        name: "Hội họa/Nhiếp ảnh/Điện ảnh",
        aliases: ["Nhiếp ảnh", "Điện ảnh"],
    },
    {
        code: "THIET_KE",
        name: "Mỹ thuật/Thiết kế/Thời trang",
        aliases: ["Thiết kế đồ họa", "Thời trang", "Design"],
    },
    {
        code: "DU_LICH",
        name: "Du lịch/Nhà hàng/Khách sạn",
        aliases: ["Du lịch", "Khách sạn", "Lữ hành"],
    },
    {
        code: "CO_KHI",
        name: "Cơ khí/Chế tạo máy/Tự động hóa",
        aliases: ["Cơ khí", "Tự động hóa", "Cơ điện tử", "Ô tô"],
    },
    {
        code: "NONG_NGHIEP",
        name: "Nông nghiệp/Lâm nghiệp/Thủy sản",
        aliases: ["Nông nghiệp", "Thủy sản"],
    },
    {
        code: "SAN_XUAT",
        name: "Sản xuất/Gia công/Chế biến",
        aliases: ["Công nghệ thực phẩm", "Chế biến"],
    },
];

/**
 * Ngân hàng đang hoạt động tại Việt Nam nhận được chuyển khoản liên ngân hàng (NAPAS 247 / chuyển thường) từ
 * MB Bank - tài khoản chi phụ cấp. Danh sách cần Ban HLC Fund kiểm tra thực tế; Admin cập nhật được (gộp,
 * đổi tên, ẩn) mà không hỏng dữ liệu đã lưu.
 */
export const BANKS: {
    code: string;
    shortName: string;
    name: string;
    aliases?: string[];
}[] = [
    {
        code: "VCB",
        shortName: "Vietcombank",
        name: "Ngân hàng TMCP Ngoại thương Việt Nam",
        aliases: ["VCB", "Ngoại thương"],
    },
    {
        code: "ICB",
        shortName: "VietinBank",
        name: "Ngân hàng TMCP Công thương Việt Nam",
        aliases: ["Vietin", "Công thương", "CTG"],
    },
    {
        code: "BIDV",
        shortName: "BIDV",
        name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam",
        aliases: ["Đầu tư và Phát triển"],
    },
    {
        code: "VBA",
        shortName: "Agribank",
        name: "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam",
        aliases: ["Nông nghiệp", "Agri"],
    },
    {
        code: "MB",
        shortName: "MB Bank",
        name: "Ngân hàng TMCP Quân đội",
        aliases: ["MB", "MBBank", "Quân đội"],
    },
    {
        code: "TCB",
        shortName: "Techcombank",
        name: "Ngân hàng TMCP Kỹ thương Việt Nam",
        aliases: ["TCB", "Kỹ thương"],
    },
    {
        code: "ACB",
        shortName: "ACB",
        name: "Ngân hàng TMCP Á Châu",
        aliases: ["Á Châu"],
    },
    {
        code: "VPB",
        shortName: "VPBank",
        name: "Ngân hàng TMCP Việt Nam Thịnh Vượng",
        aliases: ["VP Bank", "Cake", "Cake by VPBank", "Ubank"],
    },
    {
        code: "STB",
        shortName: "Sacombank",
        name: "Ngân hàng TMCP Sài Gòn Thương Tín",
        aliases: ["Sài Gòn Thương Tín"],
    },
    {
        code: "TPB",
        shortName: "TPBank",
        name: "Ngân hàng TMCP Tiên Phong",
        aliases: ["TP Bank", "Tiên Phong"],
    },
    {
        code: "HDB",
        shortName: "HDBank",
        name: "Ngân hàng TMCP Phát triển TP.HCM",
        aliases: ["HD Bank"],
    },
    {
        code: "VIB",
        shortName: "VIB",
        name: "Ngân hàng TMCP Quốc tế Việt Nam",
        aliases: ["Quốc tế"],
    },
    {
        code: "SHB",
        shortName: "SHB",
        name: "Ngân hàng TMCP Sài Gòn - Hà Nội",
        aliases: ["Sài Gòn Hà Nội"],
    },
    {
        code: "SEAB",
        shortName: "SeABank",
        name: "Ngân hàng TMCP Đông Nam Á",
        aliases: ["SeA Bank", "Đông Nam Á"],
    },
    {
        code: "MSB",
        shortName: "MSB",
        name: "Ngân hàng TMCP Hàng Hải Việt Nam",
        aliases: ["Maritime Bank", "Hàng Hải"],
    },
    {
        code: "OCB",
        shortName: "OCB",
        name: "Ngân hàng TMCP Phương Đông",
        aliases: ["Phương Đông"],
    },
    {
        code: "EIB",
        shortName: "Eximbank",
        name: "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam",
        aliases: ["Xuất nhập khẩu"],
    },
    {
        code: "LPB",
        shortName: "LPBank",
        name: "Ngân hàng TMCP Lộc Phát Việt Nam",
        aliases: ["LienVietPostBank", "Lộc Phát", "Liên Việt"],
    },
    {
        code: "NAB",
        shortName: "Nam A Bank",
        name: "Ngân hàng TMCP Nam Á",
        aliases: ["Nam Á"],
    },
    {
        code: "BAB",
        shortName: "Bac A Bank",
        name: "Ngân hàng TMCP Bắc Á",
        aliases: ["Bắc Á"],
    },
    {
        code: "ABB",
        shortName: "ABBANK",
        name: "Ngân hàng TMCP An Bình",
        aliases: ["An Bình"],
    },
    {
        code: "VIETBANK",
        shortName: "VietBank",
        name: "Ngân hàng TMCP Việt Nam Thương Tín",
        aliases: ["Việt Nam Thương Tín"],
    },
    {
        code: "KLB",
        shortName: "KienlongBank",
        name: "Ngân hàng TMCP Kiên Long",
        aliases: ["Kiên Long"],
    },
    {
        code: "PVCB",
        shortName: "PVcomBank",
        name: "Ngân hàng TMCP Đại Chúng Việt Nam",
        aliases: ["Đại Chúng"],
    },
    {
        code: "SGICB",
        shortName: "Saigonbank",
        name: "Ngân hàng TMCP Sài Gòn Công Thương",
        aliases: ["Sài Gòn Công Thương"],
    },
    {
        code: "BVBANK_BV",
        shortName: "BaoViet Bank",
        name: "Ngân hàng TMCP Bảo Việt",
        aliases: ["Bảo Việt"],
    },
    {
        code: "NCB",
        shortName: "NCB",
        name: "Ngân hàng TMCP Quốc Dân",
        aliases: ["Quốc Dân"],
    },
    {
        code: "PGB",
        shortName: "PGBank",
        name: "Ngân hàng TMCP Thịnh vượng và Phát triển",
        aliases: ["PG Bank", "Xăng dầu Petrolimex"],
    },
    {
        code: "VAB",
        shortName: "VietABank",
        name: "Ngân hàng TMCP Việt Á",
        aliases: ["Việt Á"],
    },
    {
        code: "VCCB",
        shortName: "BVBank",
        name: "Ngân hàng TMCP Bản Việt",
        aliases: ["Viet Capital", "Bản Việt", "Timo"],
    },
    {
        code: "SCB",
        shortName: "SCB",
        name: "Ngân hàng TMCP Sài Gòn",
        aliases: ["Sài Gòn"],
    },
    {
        code: "GPB",
        shortName: "GPBank",
        name: "Ngân hàng TMCP Dầu khí Toàn cầu",
        aliases: ["Dầu khí Toàn cầu"],
    },
    {
        code: "MBV",
        shortName: "MBV",
        name: "Ngân hàng TNHH MTV Việt Nam Hiện Đại",
        aliases: ["OceanBank", "Đại Dương"],
    },
    {
        code: "VIKKI",
        shortName: "Vikki Bank",
        name: "Ngân hàng TNHH MTV Số Vikki",
        aliases: ["DongA Bank", "Đông Á"],
    },
    {
        code: "VCBNEO",
        shortName: "VCBNeo",
        name: "Ngân hàng TNHH MTV Ngoại thương Công nghệ số",
        aliases: ["CBBank", "Xây dựng"],
    },
    {
        code: "COOPBANK",
        shortName: "Co-opBank",
        name: "Ngân hàng Hợp tác xã Việt Nam",
        aliases: ["Hợp tác xã"],
    },
    {
        code: "SHBVN",
        shortName: "Shinhan Bank",
        name: "Ngân hàng TNHH MTV Shinhan Việt Nam",
        aliases: ["Shinhan"],
    },
    {
        code: "HSBC",
        shortName: "HSBC",
        name: "Ngân hàng TNHH MTV HSBC (Việt Nam)",
    },
    {
        code: "SCVN",
        shortName: "Standard Chartered",
        name: "Ngân hàng TNHH MTV Standard Chartered (Việt Nam)",
    },
    {
        code: "WVN",
        shortName: "Woori Bank",
        name: "Ngân hàng TNHH MTV Woori Việt Nam",
        aliases: ["Woori"],
    },
    {
        code: "UOB",
        shortName: "UOB",
        name: "Ngân hàng TNHH MTV United Overseas Bank (Việt Nam)",
    },
    {
        code: "PBVN",
        shortName: "Public Bank",
        name: "Ngân hàng TNHH MTV Public Việt Nam",
    },
    {
        code: "CIMB",
        shortName: "CIMB",
        name: "Ngân hàng TNHH MTV CIMB Việt Nam",
    },
    {
        code: "HLBVN",
        shortName: "Hong Leong Bank",
        name: "Ngân hàng TNHH MTV Hong Leong Việt Nam",
        aliases: ["Hong Leong"],
    },
    {
        code: "IVB",
        shortName: "Indovina Bank",
        name: "Ngân hàng TNHH Indovina",
        aliases: ["Indovina"],
    },
    {
        code: "VRB",
        shortName: "VRB",
        name: "Ngân hàng Liên doanh Việt - Nga",
        aliases: ["Việt Nga"],
    },
    {
        code: "KBANK",
        shortName: "KBank",
        name: "Ngân hàng Đại chúng TNHH Kasikornbank - CN TP.HCM",
        aliases: ["Kasikornbank"],
    },
];

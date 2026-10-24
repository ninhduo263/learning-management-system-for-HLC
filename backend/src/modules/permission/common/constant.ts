/**
 * Phạm vi quyền admin phụ trách. Admin tổng (User.systemRole = Admin) có mọi quyền
 * nên không cần bản ghi AdminPermission.
 */
export enum AdminScope {
    /** Quản trị 1 module học tập (bắt buộc moduleId); nhiều module = nhiều bản ghi */
    LEARNING_MODULE = "LEARNING_MODULE",
    /** Duyệt minh chứng HLC Fund */
    FUND = "FUND",
    MENTORING = "MENTORING",
    POINT = "POINT",
    /** Trưởng ban học tập: mọi module học tập, thư viện, bài nộp, gán module */
    LEARNING = "LEARNING",
    /** Trưởng ban MTE: quản lý mọi nhóm MTE, học tập, duyệt, nộp hộ trong phạm vi MTE (sửa điểm phụ cấp phải đề xuất) */
    MENTEE = "MENTEE",
    /** Chỉ XEM dữ liệu mentoring (không duyệt, không sửa, không nộp hộ). Do MENTORING / LEARNING / MENTEE bao hàm */
    MENTORING_VIEW = "MENTORING_VIEW",
}

/**
 * Phạm vi bao hàm phạm vi khác. Trưởng ban MTE xem được điểm phụ cấp (để đề xuất) và học tập; Trưởng ban Học tập
 * xem được mentoring (điểm recap góp vào điểm học tập trung bình) nhưng không sửa.
 */
export const SCOPE_IMPLIES: Record<string, string[]> = {
    [AdminScope.MENTEE]: [
        AdminScope.POINT,
        AdminScope.LEARNING,
        AdminScope.LEARNING_MODULE,
        AdminScope.MENTORING_VIEW,
    ],
    [AdminScope.LEARNING]: [
        AdminScope.LEARNING_MODULE,
        AdminScope.MENTORING_VIEW,
    ],
    [AdminScope.MENTORING]: [AdminScope.MENTORING_VIEW],
};

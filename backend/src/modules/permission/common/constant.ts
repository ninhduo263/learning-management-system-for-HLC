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
    /** Trưởng ban MTE: toàn quyền phần MTE (điểm phụ cấp, học tập, duyệt, mọi nhóm MTE) */
    MENTEE = "MENTEE",
}

/** Phạm vi bao hàm phạm vi khác (Trưởng ban MTE có quyền điểm phụ cấp và học tập) */
export const SCOPE_IMPLIES: Record<string, string[]> = {
    [AdminScope.MENTEE]: [
        AdminScope.POINT,
        AdminScope.LEARNING,
        AdminScope.LEARNING_MODULE,
    ],
    [AdminScope.LEARNING]: [AdminScope.LEARNING_MODULE],
};

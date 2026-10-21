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
}

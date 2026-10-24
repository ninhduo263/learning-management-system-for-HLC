/** Loại nhóm: nhóm MTE (mentoring, học tập, quỹ của mentee) hoặc nhóm HLC Fund của MTO */
export enum GroupKind {
    MENTEE = "MENTEE",
    FUND = "FUND",
}

export enum DepartmentType {
    ACADEMIC = "ACADEMIC",
    FUND = "FUND",
    MENTORING = "MENTORING",
    GROUP = "GROUP",
    OTHER = "OTHER",
}

/**
 * Hành động gắn với vai trò. Nhóm 1 (GROUP_PERMISSIONS) tác động trong phạm vi nhóm: nhóm của người giữ
 * vai trò, hoặc mọi nhóm của loại nhóm được chọn (vai trò cấp ban, Position.scopeKinds).
 * Nhóm 2 (GLOBAL_PERMISSIONS) là quyền tách riêng ở cấp hệ thống.
 */
export enum RolePermission {
    /** Xem tiến độ nhóm */
    VIEW_PROGRESS = "VIEW_PROGRESS",
    /** Chấm recap MTE (chỉ nhóm MTE) */
    SCORE_RECAP = "SCORE_RECAP",
    /** Duyệt minh chứng quỹ */
    REVIEW_FUND = "REVIEW_FUND",
    /** Nộp hộ minh chứng quỹ */
    PROXY_FUND = "PROXY_FUND",
    /** Chốt kỳ phụ cấp, đánh dấu đã chi */
    LOCK_PERIOD = "LOCK_PERIOD",
    /** Sửa đơn giá, cộng / trừ điểm thủ công, bù chênh lệch (bắt buộc lý do, có nhật ký) */
    EDIT_POINTS = "EDIT_POINTS",
    /** Kế toán: chỉ xem và xuất bảng phụ cấp đã chốt */
    VIEW_PAYOUT = "VIEW_PAYOUT",
    /** Xuất dữ liệu cá nhân (số tài khoản, ngày sinh, địa chỉ...) */
    EXPORT_PERSONAL = "EXPORT_PERSONAL",
    /** Xem nhật ký thao tác */
    VIEW_ACTIVITY_LOG = "VIEW_ACTIVITY_LOG",
}

export const GROUP_PERMISSIONS: string[] = [
    RolePermission.VIEW_PROGRESS,
    RolePermission.SCORE_RECAP,
    RolePermission.REVIEW_FUND,
    RolePermission.PROXY_FUND,
];
export const GLOBAL_PERMISSIONS: string[] = [
    RolePermission.LOCK_PERIOD,
    RolePermission.EDIT_POINTS,
    RolePermission.VIEW_PAYOUT,
    RolePermission.EXPORT_PERSONAL,
    RolePermission.VIEW_ACTIVITY_LOG,
];
export const ROLE_PERMISSION_LABEL: Record<string, string> = {
    VIEW_PROGRESS: "Xem tiến độ",
    SCORE_RECAP: "Chấm / duyệt recap MTE",
    REVIEW_FUND: "Duyệt minh chứng quỹ",
    PROXY_FUND: "Nộp hộ minh chứng quỹ",
    LOCK_PERIOD: "Chốt kỳ phụ cấp",
    EDIT_POINTS: "Sửa đơn giá, điểm thủ công",
    VIEW_PAYOUT: "Xem, xuất bảng phụ cấp đã chốt",
    EXPORT_PERSONAL: "Xuất dữ liệu cá nhân",
    VIEW_ACTIVITY_LOG: "Xem nhật ký thao tác",
};

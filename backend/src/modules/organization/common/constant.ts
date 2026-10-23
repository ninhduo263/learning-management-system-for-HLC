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

/** Quyền hạn gắn với vai trò trong nhóm */
export enum RolePermission {
    /** Xem tiến độ nhóm */
    VIEW_PROGRESS = "VIEW_PROGRESS",
    /** Chấm recap MTE (chỉ nhóm MTE) */
    SCORE_RECAP = "SCORE_RECAP",
    /** Duyệt minh chứng quỹ */
    REVIEW_FUND = "REVIEW_FUND",
    /** Nộp hộ minh chứng quỹ */
    PROXY_FUND = "PROXY_FUND",
}

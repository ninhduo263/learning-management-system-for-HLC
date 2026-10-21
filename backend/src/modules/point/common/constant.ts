export enum PointCategory {
    MENTORING = "MENTORING",
    POSITION = "POSITION",
    LEARNING = "LEARNING",
    FUND = "FUND",
    BONUS = "BONUS",
    PENALTY = "PENALTY",
    OTHER = "OTHER",
}

export enum PointRuleKind {
    AUTO = "AUTO",
    RANKING = "RANKING",
    POSITION = "POSITION",
    MANUAL = "MANUAL",
}

export enum PointSourceType {
    MENTORING_RECAP = "MENTORING_RECAP",
    MENTORING_AWARD = "MENTORING_AWARD",
    MEMBER_POSITION = "MEMBER_POSITION",
    SUBMISSION = "SUBMISSION",
    /** sourceId = Period._id */
    FUND_MONTHLY = "FUND_MONTHLY",
    POINT_ADJUSTMENT = "POINT_ADJUSTMENT",
}

export enum PointAdjustmentKind {
    MANUAL = "MANUAL",
    APPEAL = "APPEAL",
}

export enum PointAdjustmentStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
}

export enum PointEntryStatus {
    ACTIVE = "ACTIVE",
    VOID = "VOID",
}

export enum AllowanceSummaryStatus {
    DRAFT = "DRAFT",
    LOCKED = "LOCKED",
    PAID = "PAID",
}

export enum PeriodExportType {
    ALLOWANCE_XLSX = "ALLOWANCE_XLSX",
    ALLOWANCE_CSV = "ALLOWANCE_CSV",
    MONTHLY_REPORT_XLSX = "MONTHLY_REPORT_XLSX",
}

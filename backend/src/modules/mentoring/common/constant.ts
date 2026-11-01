export enum MentoringQuarterStatus {
    DRAFT = "DRAFT",
    PAIRING = "PAIRING",
    ACTIVE = "ACTIVE",
    CLOSED = "CLOSED",
}

export enum MentoringPairStatus {
    ACTIVE = "ACTIVE",
    ENDED = "ENDED",
    CANCELLED = "CANCELLED",
}

export enum MentoringPairSource {
    MANUAL = "MANUAL",
    IMPORT = "IMPORT",
    INHERIT = "INHERIT",
    SUGGEST = "SUGGEST",
}

export enum MentoringSessionStatus {
    ACTIVE = "ACTIVE",
    CANCELLED = "CANCELLED",
}

export enum ScheduleLogAction {
    CREATE = "CREATE",
    UPDATE = "UPDATE",
    ADMIN_OVERRIDE = "ADMIN_OVERRIDE",
    CANCEL = "CANCEL",
}

export enum MentoringRole {
    MENTOR = "MENTOR",
    MENTEE = "MENTEE",
}

export enum RecapReviewStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
}

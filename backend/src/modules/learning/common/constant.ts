export const LEARNING_MODULE_CODE_PREFIX = "LM-";

export enum LibraryType {
    BOOK = "BOOK",
    DOCUMENT = "DOCUMENT",
}

export enum CycleType {
    DAILY = "DAILY",
    WEEKLY = "WEEKLY",
    MONTHLY = "MONTHLY",
    ONCE = "ONCE",
}

export enum ModuleFieldType {
    TEXT = "TEXT",
    LONG_TEXT = "LONG_TEXT",
    URL = "URL",
    YOUTUBE_URL = "YOUTUBE_URL",
    IMAGE = "IMAGE",
    FILE = "FILE",
    SELECT = "SELECT",
    MULTI_SELECT = "MULTI_SELECT",
    NUMBER = "NUMBER",
    DATE = "DATE",
    LIBRARY_ITEM = "LIBRARY_ITEM",
}

export enum SubmissionStatus {
    DRAFT = "DRAFT",
    SUBMITTED = "SUBMITTED",
}

export enum SubmissionReviewStatus {
    NOT_REQUIRED = "NOT_REQUIRED",
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
}

/** Module "Recap mentoring 1on1": chỉ giữ tiêu chí chấm; bài recap gốc nằm ở MentoringRecap (không nộp qua module) */
export const RECAP_MODULE_CODE = "MENTORING_RECAP";

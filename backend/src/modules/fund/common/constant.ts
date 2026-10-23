/** Chu kỳ khai báo của 1 khoản đóng (ví dụ 100.000đ/tuần đến ngày ...) */
export enum FundCycleType {
    ONCE = "ONCE",
    WEEKLY = "WEEKLY",
    MONTHLY = "MONTHLY",
}

export enum FundContributionStatus {
    PENDING = "PENDING",
    DONE = "DONE",
    NOT_DONE = "NOT_DONE",
}

/**
 * Quy tắc nghiệp vụ mentoring (hàm thuần, không truy cập DB).
 * Mọi mốc ngày tính theo giờ Việt Nam.
 */

export const VN_OFFSET_MS = 7 * 3600_000;
/** Hạn nộp recap: thời điểm mentoring (giờ bắt đầu) + 24h */
export const RECAP_WINDOW_MS = 24 * 3600_000;

export type RoleRecapStatus =
    | "NO_SCHEDULE"
    | "PENDING"
    | "SUBMITTED"
    | "LATE"
    | "MISSING";
export type PairRecapStatus =
    | "CANCELLED"
    | "NO_SCHEDULE"
    | "PENDING"
    | "DONE"
    | "LATE"
    | "MISSING";

export interface QuarterRef {
    year: number;
    quarter: number;
}

/** Ngày-giờ VN -> Date (UTC) */
export const vnDate = (
    year: number,
    month: number,
    day: number,
    hour = 0,
    minute = 0,
) => new Date(Date.UTC(year, month - 1, day, hour, minute) - VN_OFFSET_MS);

/** Các thành phần lịch của một thời điểm theo giờ VN */
export const vnParts = (value: Date) => {
    const shifted = new Date(value.getTime() + VN_OFFSET_MS);
    return {
        year: shifted.getUTCFullYear(),
        month: shifted.getUTCMonth() + 1,
        day: shifted.getUTCDate(),
    };
};

export const pad2 = (value: number) => String(value).padStart(2, "0");
export const monthKey = (year: number, month: number) =>
    `${year}-${pad2(month)}`;

export const quarterCode = ({ year, quarter }: QuarterRef) =>
    `${year}Q${quarter}`;

export function parseQuarterCode(code: string): QuarterRef | null {
    const match = /^(\d{4})Q([1-4])$/i.exec(String(code || "").trim());
    return match ? { year: Number(match[1]), quarter: Number(match[2]) } : null;
}

export const quarterIndex = ({ year, quarter }: QuarterRef) =>
    year * 4 + (quarter - 1);

export const quarterFromIndex = (index: number): QuarterRef => ({
    year: Math.floor(index / 4),
    quarter: (index % 4) + 1,
});

export function quarterOfDate(value: Date): QuarterRef {
    const { year, month } = vnParts(value);
    return { year, quarter: Math.floor((month - 1) / 3) + 1 };
}

export const quarterMonths = ({ quarter }: QuarterRef) =>
    [1, 2, 3].map((offset) => (quarter - 1) * 3 + offset);

export function quarterDates(ref: QuarterRef) {
    const [firstMonth, , lastMonth] = quarterMonths(ref);
    const lastDay = new Date(Date.UTC(ref.year, lastMonth, 0)).getUTCDate();
    return {
        startDate: `${ref.year}-${pad2(firstMonth)}-01`,
        endDate: `${ref.year}-${pad2(lastMonth)}-${pad2(lastDay)}`,
    };
}

/** Mốc trong tháng cuối của quý trước: ngày 5 mở nguyện vọng, 10 mở ghép cặp, 25 công bố */
export function quarterTimeline(ref: QuarterRef) {
    const previous = quarterFromIndex(quarterIndex(ref) - 1);
    const lastMonth = quarterMonths(previous)[2];
    return {
        preferenceOpenAt: vnDate(previous.year, lastMonth, 5),
        pairingOpenAt: vnDate(previous.year, lastMonth, 10),
        visibleAt: vnDate(previous.year, lastMonth, 25),
    };
}

/** Admin được mở/ghép quý hiện tại, hoặc quý kế tiếp từ ngày 10 tháng cuối quý hiện tại */
export function canAdminPair(ref: QuarterRef, now: Date) {
    const current = quarterIndex(quarterOfDate(now));
    const target = quarterIndex(ref);
    if (target === current) return true;
    return target === current + 1 && now >= quarterTimeline(ref).pairingOpenAt;
}

/** Mentor/mentee thấy cặp của quý từ ngày 25 tháng cuối quý trước */
export const isVisibleToMember = (timeline: { visibleAt: Date }, now: Date) =>
    now >= timeline.visibleAt;

/** Mentee gửi nguyện vọng từ ngày 5 đến trước ngày 10 tháng cuối quý trước */
export const canChoosePreference = (
    timeline: { preferenceOpenAt: Date; pairingOpenAt: Date },
    now: Date,
) => now >= timeline.preferenceOpenAt && now < timeline.pairingOpenAt;

/** 5 chữ số cuối của mã thành viên (HLC-MTE-00012 -> 00012) */
export function memberSuffix(memberCode: string) {
    const digits = String(memberCode || "").replace(/\D/g, "");
    return digits.slice(-5).padStart(5, "0");
}

/** Mã quý của cặp: Q{quý}{năm}O{mentor}E{mentee} */
export const pairCode = (
    ref: QuarterRef,
    mentorCode: string,
    menteeCode: string,
) =>
    `Q${ref.quarter}${ref.year}O${memberSuffix(mentorCode)}E${memberSuffix(menteeCode)}`;

/** Mã mentoring tháng: T{tháng}Q{quý}{năm}O{mentor}E{mentee} */
export const sessionCode = (
    ref: QuarterRef,
    month: number,
    mentorCode: string,
    menteeCode: string,
) => `T${month}${pairCode(ref, mentorCode, menteeCode)}`;

export interface SessionLike {
    status?: string;
    scheduledStartAt?: Date | string | null;
    scheduledEndAt?: Date | string | null;
    firstScheduledStartAt?: Date | string | null;
    recapDeadlineAt?: Date | string | null;
    importedStatus?: Record<string, unknown> | null;
}

export interface RecapLike {
    firstSubmittedAt: Date | string;
    isLate: boolean;
    reviewStatus?: string;
}

const time = (value?: Date | string | null) =>
    value ? new Date(value).getTime() : null;

/** Trạng thái nộp recap của một người tại thời điểm now */
export function roleRecapStatus(
    session: SessionLike,
    recap: RecapLike | null | undefined,
    now: Date,
): RoleRecapStatus {
    if (!session.scheduledStartAt) return "NO_SCHEDULE";
    if (
        recap &&
        recap.reviewStatus !== "REJECTED" &&
        time(recap.firstSubmittedAt) <= now.getTime()
    ) {
        return recap.isLate ? "LATE" : "SUBMITTED";
    }
    return now.getTime() > time(session.recapDeadlineAt)
        ? "MISSING"
        : "PENDING";
}

/** Trạng thái của cặp trong tháng (ưu tiên: Chưa xong > Nộp muộn > Đã xong > Chờ) */
export function pairRecapStatus(
    session: SessionLike,
    mentorStatus: RoleRecapStatus,
    menteeStatus: RoleRecapStatus,
): PairRecapStatus {
    if (session.status === "CANCELLED") return "CANCELLED";
    if (!session.scheduledStartAt) return "NO_SCHEDULE";
    return combineRecapStatuses(mentorStatus, menteeStatus);
}

/** Gộp trạng thái 2 người thành trạng thái cặp */
export function combineRecapStatuses(
    mentorStatus: RoleRecapStatus,
    menteeStatus: RoleRecapStatus,
): PairRecapStatus {
    const statuses = [mentorStatus, menteeStatus];
    if (statuses.includes("NO_SCHEDULE")) return "NO_SCHEDULE";
    if (statuses.includes("MISSING")) return "MISSING";
    if (statuses.includes("LATE")) return "LATE";
    if (statuses.every((status) => status === "SUBMITTED")) return "DONE";
    return "PENDING";
}

/** Trạng thái lấy từ file Excel cũ (khi buổi chưa có lịch trên hệ thống) */
export function importedRoleStatus(
    session: SessionLike,
    role: "MENTOR" | "MENTEE",
): RoleRecapStatus | null {
    const value = String(session.importedStatus?.[role.toLowerCase()] ?? "");
    if (!value) return null;
    return (
        (
            {
                DONE: "SUBMITTED",
                LATE: "LATE",
                MISSING: "MISSING",
                PENDING: "PENDING",
            } as Record<string, RoleRecapStatus>
        )[value] ?? null
    );
}

/** Được gửi/sửa lịch khi chưa có lịch, hoặc chưa tới thời điểm đã chốt lần đầu */
export const canEditSchedule = (session: SessionLike, now: Date) =>
    session.status !== "CANCELLED" &&
    (!session.firstScheduledStartAt ||
        now.getTime() < time(session.firstScheduledStartAt));

/** Được viết/sửa recap sau khi buổi kết thúc, khi recap chưa được duyệt */
export const canWriteRecap = (
    session: SessionLike,
    recap: { reviewStatus?: string } | null | undefined,
    now: Date,
) =>
    session.status !== "CANCELLED" &&
    Boolean(session.scheduledEndAt) &&
    now.getTime() >= time(session.scheduledEndAt) &&
    recap?.reviewStatus !== "APPROVED";

/** Lịch phải nằm trọn trong tháng của buổi (theo giờ VN) */
export function isWithinMonth(
    start: Date,
    end: Date,
    year: number,
    month: number,
) {
    const s = vnParts(start);
    const e = vnParts(end);
    return (
        s.year === year &&
        s.month === month &&
        e.year === year &&
        e.month === month
    );
}

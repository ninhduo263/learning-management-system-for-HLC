import { vnIsoWeekKey } from "@common/utils/vn-date.util";
import { FundContributionStatus } from "../common/constant";

export type WeekStatus = "NONE" | FundContributionStatus;

const pad = (value: number) => String(value).padStart(2, "0");
const dateKey = (date: Date) =>
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
const parseKey = (key: string) => new Date(`${key}T00:00:00Z`);

/** Tuần ISO của ngày YYYY-MM-DD */
export const weekOfDate = (date: string) =>
    vnIsoWeekKey(new Date(`${date}T12:00:00+07:00`));

/** Các tuần ISO giao với tháng (cắt theo đầu/cuối tháng) */
export function weeksOfPeriod(period: { year: number; month: number }) {
    const lastDay = new Date(
        Date.UTC(period.year, period.month, 0),
    ).getUTCDate();
    const weeks: { weekKey: string; from: string; to: string }[] = [];
    for (let day = 1; day <= lastDay; day += 1) {
        const date = `${period.year}-${pad(period.month)}-${pad(day)}`;
        const weekKey = weekOfDate(date);
        const current = weeks[weeks.length - 1];
        if (current?.weekKey === weekKey) current.to = date;
        else weeks.push({ weekKey, from: date, to: date });
    }
    return weeks;
}

/**
 * Tuần "thuộc" tháng theo quy tắc ISO (ngày thứ Năm của tuần nằm trong tháng),
 * để mỗi tuần chỉ tính cho đúng 1 tháng. Kèm ngày Chủ nhật kết thúc tuần.
 */
export function weeksOwnedByMonth(period: { year: number; month: number }) {
    const lastDay = new Date(
        Date.UTC(period.year, period.month, 0),
    ).getUTCDate();
    const result: { weekKey: string; endDate: string }[] = [];
    for (let day = 1; day <= lastDay; day += 1) {
        const date = new Date(Date.UTC(period.year, period.month - 1, day));
        if (date.getUTCDay() !== 4) continue;
        const sunday = new Date(date.getTime() + 3 * 86400000);
        result.push({
            weekKey: weekOfDate(dateKey(date)),
            endDate: dateKey(sunday),
        });
    }
    return result;
}

/** Các tuần mà 1 khoản đóng bao phủ: từ ngày đóng đến "đóng đến ngày" (coverUntil) */
export function coveredWeeks(row: {
    contributionDate: string;
    coverUntil?: string | null;
}) {
    const weeks = new Set<string>([weekOfDate(row.contributionDate)]);
    if (row.coverUntil && row.coverUntil > row.contributionDate) {
        const end = parseKey(row.coverUntil).getTime();
        for (
            let time = parseKey(row.contributionDate).getTime();
            time <= end;
            time += 86400000
        ) {
            weeks.add(weekOfDate(dateKey(new Date(time))));
        }
    }
    return weeks;
}

/** Trạng thái tuần: Đã xong nếu có khoản được duyệt bao phủ; Chờ nếu đang chờ; Chưa xong nếu chỉ có khoản bị từ chối */
export function weekStatus(rows: { status?: string }[]): WeekStatus {
    if (rows.some((row) => row.status === FundContributionStatus.DONE))
        return FundContributionStatus.DONE;
    if (rows.some((row) => row.status === FundContributionStatus.PENDING))
        return FundContributionStatus.PENDING;
    if (rows.length) return FundContributionStatus.NOT_DONE;
    return "NONE";
}

/** Các khoản bao phủ 1 tuần */
export const rowsOfWeek = <
    T extends { contributionDate: string; coverUntil?: string | null },
>(
    rows: T[],
    weekKey: string,
) => rows.filter((row) => coveredWeeks(row).has(weekKey));

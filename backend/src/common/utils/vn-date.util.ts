/** Tiện ích ngày giờ theo giờ Việt Nam (UTC+7, không có giờ mùa hè) */
export const VN_OFFSET_MS = 7 * 3600_000;

export const pad2 = (value: number) => String(value).padStart(2, "0");

export function vnParts(value: Date) {
    const shifted = new Date(value.getTime() + VN_OFFSET_MS);
    return {
        year: shifted.getUTCFullYear(),
        month: shifted.getUTCMonth() + 1,
        day: shifted.getUTCDate(),
        weekday: shifted.getUTCDay(),
    };
}

/** Thời điểm 00:00 giờ VN của một ngày */
export const vnStartOfDay = (year: number, month: number, day: number) =>
    new Date(Date.UTC(year, month - 1, day) - VN_OFFSET_MS);

export const monthKey = (year: number, month: number) =>
    `${year}-${pad2(month)}`;

/** YYYY-MM-DD theo giờ VN */
export function vnDateKey(value: Date) {
    const { year, month, day } = vnParts(value);
    return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Tuần ISO 8601 theo giờ VN, ví dụ 2026-W43 */
export function vnIsoWeekKey(value: Date) {
    const { year, month, day } = vnParts(value);
    const date = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayOfWeek);
    const weekYear = date.getUTCFullYear();
    const firstDay = new Date(Date.UTC(weekYear, 0, 1));
    const week = Math.ceil(
        ((date.getTime() - firstDay.getTime()) / 86400000 + 1) / 7,
    );
    return `${weekYear}-W${pad2(week)}`;
}

/** "YYYY-MM-DD" hợp lệ thật (không nhận 2026-02-30) */
export function isValidDateKey(value: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
    if (!match) return false;
    const date = new Date(
        Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
    );
    return (
        date.getUTCMonth() === Number(match[2]) - 1 &&
        date.getUTCDate() === Number(match[3])
    );
}

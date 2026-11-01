import { ApiError } from "@config/exception/api-error";
import { Injectable, Logger } from "@nestjs/common";

export type MockDateSource = "runtime" | "environment" | "real";

/**
 * Nguồn "bây giờ" duy nhất cho mọi quy tắc nghiệp vụ.
 * Admin có thể đặt ngày giả lập để kiểm thử các mốc (ngày 5/10/25, hạn recap 24h...).
 * Ngày giả lập chỉ thay ngày, giữ nguyên giờ thật trong ngày.
 */
@Injectable()
export class TimeService {
    /** undefined = chưa đặt lúc chạy (dùng biến môi trường), null = buộc dùng ngày thật */
    private runtimeMockDate: string | null | undefined = undefined;

    constructor() {
        const fromEnv = this.normalize(process.env.MOCK_DATE);
        if (fromEnv) Logger.warn(`MOCK_DATE=${fromEnv}`, TimeService.name);
    }

    private normalize(value?: string | null): string | null {
        const text = String(value ?? "").trim();
        if (!text) return null;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
        const date = new Date(`${text}T00:00:00.000Z`);
        return !Number.isNaN(date.getTime()) &&
            date.toISOString().slice(0, 10) === text
            ? text
            : null;
    }

    getMockDate(): { date: string | null; source: MockDateSource } {
        if (this.runtimeMockDate !== undefined) {
            return {
                date: this.runtimeMockDate,
                source: this.runtimeMockDate ? "runtime" : "real",
            };
        }
        const fromEnv = this.normalize(process.env.MOCK_DATE);
        return { date: fromEnv, source: fromEnv ? "environment" : "real" };
    }

    getMockDateState() {
        const { date, source } = this.getMockDate();
        return { date, source, enabled: date !== null };
    }

    setMockDate(value: string | null) {
        if (value === null) {
            this.runtimeMockDate = null;
            return this.getMockDateState();
        }
        const normalized = this.normalize(value);
        if (!normalized) {
            throw ApiError.BadRequest("error-mock-date-invalid");
        }
        this.runtimeMockDate = normalized;
        return this.getMockDateState();
    }

    /** Thời điểm hiện tại theo ngày giả lập (nếu có), giờ thật trong ngày theo giờ Việt Nam. */
    now(): Date {
        const { date } = this.getMockDate();
        const real = new Date();
        if (!date) return real;
        const vnClock = new Date(real.getTime() + 7 * 3600_000)
            .toISOString()
            .slice(11, 23);
        return new Date(`${date}T${vnClock}+07:00`);
    }
}

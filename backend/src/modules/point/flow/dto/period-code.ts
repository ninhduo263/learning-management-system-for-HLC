import { ApiError } from "@config/exception/api-error";

/** Mã kỳ YYYY-MM */
export function periodCode(value: string) {
    const code = String(value ?? "").trim();
    const match = /^(\d{4})-(\d{2})$/.exec(code);
    if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) {
        throw ApiError.BadRequest("error-period-not-found", { code });
    }
    return code;
}

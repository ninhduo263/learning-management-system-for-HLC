import { Matches } from "class-validator";

export class EnsureQuarterDto {
    /** Ví dụ 2026Q4 */
    @Matches(/^\d{4}Q[1-4]$/i)
    code: string;
}

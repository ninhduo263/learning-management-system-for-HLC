import { Type } from "class-transformer";
import { IsInt, Matches, Max, Min } from "class-validator";
import { MENTOR_CODE, MENTEE_CODE } from "./member-code";

export class CreatePairDto {
    /** Mã mentor, ví dụ HLC-MTO-00012 */
    @Matches(MENTOR_CODE)
    mentorCode: string;

    /** Mã mentee, ví dụ HLC-MTE-00034 */
    @Matches(MENTEE_CODE)
    menteeCode: string;

    /** Tháng bắt đầu (1-12, phải thuộc quý). Hệ thống tạo buổi từ tháng này tới hết quý */
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(12)
    month: number;
}

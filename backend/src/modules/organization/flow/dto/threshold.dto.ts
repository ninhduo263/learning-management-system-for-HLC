import { Type } from "class-transformer";
import { IsNumber, Max, Min } from "class-validator";

export class ThresholdDto {
    /** Ngưỡng % nhóm MTE (thưởng khi tỷ lệ hoàn thành vượt ngưỡng) */
    @Type(() => Number)
    @IsNumber({}, { message: "Ngưỡng phải là số" })
    @Min(0, { message: "Ngưỡng từ 0 đến 100" })
    @Max(100, { message: "Ngưỡng từ 0 đến 100" })
    MENTEE: number;

    /** Ngưỡng % nhóm HLC Fund của MTO và thầy cô */
    @Type(() => Number)
    @IsNumber({}, { message: "Ngưỡng phải là số" })
    @Min(0, { message: "Ngưỡng từ 0 đến 100" })
    @Max(100, { message: "Ngưỡng từ 0 đến 100" })
    FUND: number;
}

import { IsNumber, IsOptional, Matches, Min } from "class-validator";

export class PeriodSettingsDto {
    /** Số tiền cho 1 điểm */
    @IsNumber()
    @Min(0)
    @IsOptional()
    pointRate?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    baseAllowance?: number;

    /** YYYY-MM-DD */
    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    @IsOptional()
    payoutDate?: string;
}

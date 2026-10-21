import {
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";

export class AdjustmentDto {
    @IsString()
    @IsNotEmpty()
    memberId: string;

    /** Bỏ trống: tự chọn MANUAL_BONUS (điểm dương) / MANUAL_PENALTY (điểm âm) */
    @IsString()
    @IsOptional()
    pointTypeId?: string;

    /** Dương = cộng, âm = trừ */
    @IsNumber()
    points: number;

    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    reason: string;

    @IsString()
    @IsOptional()
    relatedEntryId?: string;
}

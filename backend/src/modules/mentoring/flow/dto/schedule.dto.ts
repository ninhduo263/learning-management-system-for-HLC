import { IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

export class ScheduleDto {
    /** ISO 8601, nên kèm múi giờ */
    @IsDateString()
    startAt: string;

    @IsDateString()
    endAt: string;

    @IsString()
    @MaxLength(255)
    @IsOptional()
    location?: string;

    @IsString()
    @IsOptional()
    meetingLink?: string;

    @IsString()
    @IsOptional()
    note?: string;
}

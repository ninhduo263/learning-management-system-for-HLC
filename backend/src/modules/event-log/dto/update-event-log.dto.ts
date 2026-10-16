import { IsString, IsOptional, IsBoolean } from "class-validator";

export class UpdateEventLogDto {
    @IsString()
    @IsOptional()
    eventId?: string;

    @IsString()
    @IsOptional()
    identityCode?: string;

    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    gender?: string;

    @IsBoolean()
    @IsOptional()
    isCheckedIn?: boolean;

    @IsBoolean()
    @IsOptional()
    isCheckedOut?: boolean;

    @IsString()
    @IsOptional()
    checkInTime?: string;
}

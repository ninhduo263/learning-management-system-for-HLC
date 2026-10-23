import {
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";

export class ContributorDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    fullName: string;

    @IsString()
    @IsOptional()
    organization?: string;

    @IsString()
    @IsOptional()
    contact?: string;

    /** Nhóm HLC Fund phụ trách */
    @IsString()
    @IsOptional()
    groupId?: string;

    @IsString()
    @IsOptional()
    note?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

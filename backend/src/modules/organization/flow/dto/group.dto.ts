import {
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";

export class GroupDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    @IsBoolean()
    @IsOptional()
    deputyCanReview?: boolean;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

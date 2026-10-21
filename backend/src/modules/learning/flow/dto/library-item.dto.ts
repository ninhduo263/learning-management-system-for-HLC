import {
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";
import { LibraryType } from "../../common/constant";

export class LibraryItemDto {
    @IsEnum(LibraryType)
    libraryType: LibraryType;

    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    title: string;

    @IsString()
    @IsOptional()
    author?: string;

    @IsString()
    @IsOptional()
    category?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    coverUrl?: string;

    @IsString()
    @IsOptional()
    fileUrl?: string;

    @IsString()
    @IsOptional()
    externalUrl?: string;

    @IsString()
    @IsOptional()
    departmentId?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

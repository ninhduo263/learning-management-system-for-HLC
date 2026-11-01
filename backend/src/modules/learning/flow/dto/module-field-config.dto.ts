import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
} from "class-validator";
import { ModuleFieldType } from "../../common/constant";

export class ModuleFieldConfigDto {
    /** Giữ _id khi sửa trường có sẵn */
    @IsString()
    @IsOptional()
    _id?: string;

    @Matches(/^[a-zA-Z][a-zA-Z0-9_]{0,49}$/)
    key: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    label: string;

    @IsEnum(ModuleFieldType)
    fieldType: ModuleFieldType;

    @IsBoolean()
    @IsOptional()
    isRequired?: boolean;

    /** Không cho 2 bài nộp trùng giá trị (vd link YouTube) */
    @IsBoolean()
    @IsOptional()
    isUnique?: boolean;

    @IsArray()
    @IsOptional()
    options?: string[];

    @IsObject()
    @IsOptional()
    validation?: Record<string, unknown>;
}

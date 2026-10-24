import {
    IsArray,
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
} from "class-validator";

export class ProvinceDto {
    @Matches(/^[A-Z0-9_]{2,30}$/, {
        message: "Mã tỉnh chỉ gồm chữ in hoa, số và dấu _",
    })
    code: string;

    @IsString()
    @IsNotEmpty({ message: "Nhập tên tỉnh, thành phố" })
    name: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    aliases?: string[];

    @IsString()
    @IsOptional()
    mergedInto?: string | null;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsInt()
    @IsOptional()
    sortOrder?: number;
}

import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsIn,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Matches,
    Max,
    MaxLength,
    Min,
} from "class-validator";

export class RoleDto {
    /** Mã vai trò (chữ in hoa, số, _); không đổi được sau khi tạo */
    @Matches(/^[A-Z0-9_]{2,50}$/, {
        message: "Mã vai trò chỉ gồm chữ in hoa, số và dấu _",
    })
    @IsOptional()
    code?: string;

    @IsString()
    @IsNotEmpty({ message: "Cần nhập tên vai trò" })
    @MaxLength(255)
    name: string;

    /** Bắt buộc chọn: MENTEE (nhóm MTE), FUND (nhóm HLC Fund của MTO & thầy cô), BAN (chức vụ ban, không gắn nhóm) */
    @IsIn(["MENTEE", "FUND", "BAN"], { message: "Cần chọn loại nhóm áp dụng" })
    appliesTo: "MENTEE" | "FUND" | "BAN";

    @IsArray()
    @IsIn(["VIEW_PROGRESS", "SCORE_RECAP", "REVIEW_FUND", "PROXY_FUND"], {
        each: true,
    })
    @IsOptional()
    permissions?: string[];

    @Type(() => Number)
    @IsNumber({}, { message: "Điểm phụ cấp phải là số" })
    @Min(0, { message: "Điểm phụ cấp không được âm" })
    @Max(100)
    @IsOptional()
    allowancePoints?: number;

    @Type(() => Number)
    @IsNumber({}, { message: "Điểm thưởng phải là số" })
    @Min(0, { message: "Điểm thưởng không được âm" })
    @Max(100)
    @IsOptional()
    bonusPoints?: number;

    /** Vai trò quản trị hệ thống: FUND | MENTORING | POINT */
    @IsIn(["FUND", "MENTORING", "POINT", null, ""])
    @IsOptional()
    adminScope?: string | null;

    @IsString()
    @IsOptional()
    description?: string;

    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    sortOrder?: number;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

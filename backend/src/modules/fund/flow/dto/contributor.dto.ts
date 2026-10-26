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

    /** Số điện thoại có đăng ký Zalo (bắt buộc khi thêm mới; khi sửa bỏ trống thì giữ số cũ) */
    @IsString()
    @IsOptional()
    @MaxLength(20)
    phone?: string;

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

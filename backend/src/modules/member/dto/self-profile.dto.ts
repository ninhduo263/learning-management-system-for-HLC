import {
    IsArray,
    IsBoolean,
    IsEmail,
    IsEnum,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
} from "class-validator";
import { Gender } from "../common/constant";

/** Thông tin thành viên tự sửa */
export class SelfProfileDto {
    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    @IsOptional()
    dateOfBirth?: string;

    @IsEnum(Gender)
    @IsOptional()
    gender?: Gender;

    @IsString()
    @MaxLength(20)
    @IsOptional()
    phone?: string;

    /** Ẩn số điện thoại (và Zalo) với người ngoài cặp và nhóm của mình; có hiệu lực ngay, ghi lịch sử */
    @IsBoolean()
    @IsOptional()
    hidePhone?: boolean;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @MaxLength(500)
    @IsOptional()
    address?: string;

    @IsString()
    @MaxLength(255)
    @IsOptional()
    hometown?: string;

    @IsString()
    @IsOptional()
    profileUrl?: string;

    /** Ngành học: mã các nhóm ngành nghề (chọn nhiều, danh mục CAREER) */
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    majorCodes?: string[];

    /** Ngành nghề: mã các nhóm ngành nghề (chọn nhiều) */
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    occupationCodes?: string[];

    /** Ngân hàng: mã danh mục BANK */
    @IsString()
    @IsOptional()
    bankCode?: string;

    /** Số CCCD (thay đổi cần duyệt) */
    @Matches(/^(\d{12}|.*•.*)?$/, { message: "Số CCCD gồm 12 chữ số" })
    @IsOptional()
    nationalId?: string;

    /** Quê quán: mã tỉnh, thành phố trong danh mục (rỗng = bỏ chọn) */
    @IsString()
    @IsOptional()
    hometownCode?: string;

    /** Địa chỉ: mã tỉnh, thành phố trong danh mục */
    @IsString()
    @IsOptional()
    addressCode?: string;

    @Matches(/^([0-9 ]{4,30}|.*•.*)$/, {
        message: "Số tài khoản chỉ gồm chữ số",
    })
    @IsOptional()
    bankAccount?: string;

    @IsString()
    @MaxLength(255)
    @IsOptional()
    bankName?: string;
}

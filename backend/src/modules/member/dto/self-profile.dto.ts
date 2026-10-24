import {
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

    @IsString()
    @MaxLength(255)
    @IsOptional()
    major?: string;

    @IsString()
    @MaxLength(255)
    @IsOptional()
    occupation?: string;

    /** Quê quán: mã tỉnh, thành phố trong danh mục (rỗng = bỏ chọn) */
    @IsString()
    @IsOptional()
    hometownCode?: string;

    /** Địa chỉ: mã tỉnh, thành phố trong danh mục */
    @IsString()
    @IsOptional()
    addressCode?: string;

    @Matches(/^[0-9 ]{4,30}$/, { message: "Số tài khoản chỉ gồm chữ số" })
    @IsOptional()
    bankAccount?: string;

    @IsString()
    @MaxLength(255)
    @IsOptional()
    bankName?: string;
}

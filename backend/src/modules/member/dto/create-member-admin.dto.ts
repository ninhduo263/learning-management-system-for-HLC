import {
    IsArray,
    IsBoolean,
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
} from "class-validator";
import { Gender, MemberType } from "../common/constant";

/** Admin toàn cục thêm thành viên mới trên web (mã do hệ thống sinh) */
export class CreateMemberAdminDto {
    @IsString()
    @IsNotEmpty({ message: "Nhập họ và tên" })
    @MaxLength(255)
    fullName: string;

    @IsEnum(Gender, { message: "Chọn giới tính" })
    gender: Gender;

    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Ngày sinh dạng YYYY-MM-DD" })
    dateOfBirth: string;

    @IsEnum(MemberType, { message: "Chọn loại thành viên (MTE hoặc MTO)" })
    memberType: MemberType;

    @IsString()
    @IsNotEmpty({ message: "Chọn quê quán" })
    hometownCode: string;

    @IsString()
    @IsNotEmpty({ message: "Chọn địa chỉ" })
    addressCode: string;

    @Matches(/^(\+84|0)\d{9,10}$/, {
        message: "Số điện thoại không hợp lệ (VD 0912345678)",
    })
    phone: string;

    @IsEmail({}, { message: "Email không hợp lệ" })
    email: string;

    /** Tùy chọn: số CCCD 12 chữ số */
    @Matches(/^\d{12}$/, { message: "Số CCCD gồm 12 chữ số" })
    @IsOptional()
    nationalId?: string;

    @Matches(/^[0-9]{4,30}$/, { message: "Số tài khoản chỉ gồm chữ số" })
    @IsOptional()
    bankAccount?: string;

    /** Mã ngân hàng trong danh mục (bắt buộc khi có số tài khoản) */
    @IsString()
    @IsOptional()
    bankCode?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    majorCodes?: string[];

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    occupationCodes?: string[];

    /** Nhóm: bắt buộc với MTE (nhóm MTE); MTO có thể chọn nhóm HLC Fund */
    @IsString()
    @IsOptional()
    groupId?: string;

    /** Đã xem cảnh báo trùng họ tên + ngày sinh và vẫn muốn tạo */
    @IsBoolean()
    @IsOptional()
    confirmDuplicate?: boolean;
}

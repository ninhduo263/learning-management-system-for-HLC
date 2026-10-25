import { EntityDefinition } from "@common/constant/class/entity-definition";
import { IsYYYYMMDD } from "@common/decorator/validate.decorator";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
    IsArray,
    IsBoolean,
} from "class-validator";
import { Gender, MemberStatus, MemberType } from "../common/constant";

export class Member implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Tài khoản" })
    userId?: string;

    @IsString()
    @MaxLength(20)
    @EntityDefinition.field({ label: "Mã thành viên", required: true })
    memberCode: string;

    @IsEnum(MemberType)
    @EntityDefinition.field({
        label: "Loại thành viên",
        required: true,
        enum: Object.values(MemberType),
    })
    memberType: MemberType;

    @IsString()
    @MaxLength(255)
    @EntityDefinition.field({ label: "Họ và tên", required: true })
    fullName: string;

    @IsYYYYMMDD()
    @IsOptional()
    @EntityDefinition.field({ label: "Ngày sinh" })
    dateOfBirth?: string;

    @IsEnum(Gender)
    @IsOptional()
    @EntityDefinition.field({ label: "Giới tính", enum: Object.values(Gender) })
    gender?: Gender;

    @IsString()
    @MaxLength(20)
    @IsOptional()
    @EntityDefinition.field({ label: "Số điện thoại" })
    phone?: string;

    @IsBoolean()
    @IsOptional()
    @EntityDefinition.field({
        label: "Ẩn số điện thoại với người ngoài cặp và nhóm",
    })
    hidePhone?: boolean;

    @IsString()
    @MaxLength(255)
    @IsOptional()
    @EntityDefinition.field({ label: "Email" })
    email?: string;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Link profile" })
    profileUrl?: string;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Địa chỉ hiện tại" })
    address?: string;

    @IsString()
    @MaxLength(255)
    @IsOptional()
    @EntityDefinition.field({ label: "Quê quán" })
    hometown?: string;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Số CCCD" })
    nationalId?: string;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Ngành học" })
    major?: string;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Ngành nghề" })
    occupation?: string;

    @IsArray()
    @IsOptional()
    @EntityDefinition.field({ label: "Ngành học (nhóm)" })
    majorCodes?: string[];

    @IsArray()
    @IsOptional()
    @EntityDefinition.field({ label: "Ngành nghề (nhóm)" })
    occupationCodes?: string[];

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Mã ngân hàng" })
    bankCode?: string;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Quê quán (tỉnh, thành phố)" })
    hometownCode?: string;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Địa chỉ (tỉnh, thành phố)" })
    addressCode?: string;

    @IsString()
    @MaxLength(50)
    @IsOptional()
    @EntityDefinition.field({ label: "Số tài khoản" })
    bankAccount?: string;

    @IsString()
    @MaxLength(255)
    @IsOptional()
    @EntityDefinition.field({ label: "Ngân hàng" })
    bankName?: string;

    @IsString()
    @MaxLength(100)
    @IsOptional()
    @EntityDefinition.field({ label: "Loại phụ cấp sinh hoạt" })
    livingAllowanceType?: string;

    @IsYYYYMMDD()
    @IsOptional()
    @EntityDefinition.field({ label: "Ngày tham gia" })
    joinedAt?: string;

    @IsYYYYMMDD()
    @IsOptional()
    @EntityDefinition.field({ label: "Ngày bắt đầu phụ cấp" })
    allowanceStartDate?: string;

    @IsEnum(MemberStatus)
    @IsOptional()
    @EntityDefinition.field({
        label: "Trạng thái",
        enum: Object.values(MemberStatus),
    })
    status?: MemberStatus;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Ghi chú" })
    note?: string;
}

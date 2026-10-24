import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
} from "class-validator";
import { MemberStatus, MemberType } from "../common/constant";
import { SelfProfileDto } from "./self-profile.dto";

export class AdminProfileDto extends SelfProfileDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    @IsOptional()
    fullName?: string;

    @IsEnum(MemberType)
    @IsOptional()
    memberType?: MemberType;

    @IsEnum(MemberStatus)
    @IsOptional()
    status?: MemberStatus;

    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    @IsOptional()
    joinedAt?: string;

    @IsString()
    @IsOptional()
    note?: string;

    @Matches(/^(\d{12}|.*•.*)$/, { message: "Số CCCD gồm 12 chữ số" })
    @IsOptional()
    nationalId?: string;
}

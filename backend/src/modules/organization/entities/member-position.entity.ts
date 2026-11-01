import { EntityDefinition } from "@common/constant/class/entity-definition";
import { IsYYYYMMDD } from "@common/decorator/validate.decorator";
import { BaseEntity } from "@common/interface/base-entity.interface";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class MemberPosition implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Thành viên", required: true })
    memberId: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Ban", required: true })
    departmentId: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Chức vụ", required: true })
    positionId: string;

    @IsYYYYMMDD()
    @EntityDefinition.field({ label: "Từ ngày", required: true })
    startDate: string;

    @IsYYYYMMDD()
    @IsOptional()
    @EntityDefinition.field({ label: "Đến ngày" })
    endDate?: string;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Ghi chú" })
    note?: string;
}

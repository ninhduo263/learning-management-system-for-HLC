import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsBoolean,
    IsDateString,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";

export class ModuleAssignment implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Module", required: true })
    moduleId: string;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Kỳ tháng" })
    periodId?: string;

    @IsString()
    @MaxLength(20)
    @EntityDefinition.field({ label: "Chu kỳ", required: true })
    cycleKey: string;

    @IsString()
    @MaxLength(500)
    @EntityDefinition.field({ label: "Tiêu đề", required: true })
    title: string;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Mô tả" })
    description?: string;

    @IsDateString()
    @IsOptional()
    @EntityDefinition.field({ label: "Mở nộp" })
    openAt?: Date;

    @IsDateString()
    @IsOptional()
    @EntityDefinition.field({ label: "Hạn nộp" })
    dueAt?: Date;

    @IsBoolean()
    @IsOptional()
    @EntityDefinition.field({ label: "Đang hoạt động" })
    isActive?: boolean;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Người tạo" })
    createdBy?: string;
}

import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsObject,
    IsOptional,
    IsPositive,
    IsString,
    MaxLength,
} from "class-validator";
import { TargetMemberType } from "@module/member/common/constant";
import { CycleType, LibraryType } from "../common/constant";

export class LearningModule implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(50)
    @EntityDefinition.field({ label: "Mã module", disableImport: true })
    code: string;

    @IsString()
    @MaxLength(255)
    @EntityDefinition.field({ label: "Tên module", required: true })
    name: string;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Mô tả" })
    description?: string;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Ban phụ trách" })
    departmentId?: string;

    @IsEnum(TargetMemberType)
    @IsOptional()
    @EntityDefinition.field({
        label: "Đối tượng nộp",
        enum: Object.values(TargetMemberType),
    })
    targetMemberType?: TargetMemberType;

    @IsEnum(CycleType)
    @EntityDefinition.field({
        label: "Chu kỳ",
        required: true,
        enum: Object.values(CycleType),
    })
    cycleType: CycleType;

    @IsInt()
    @IsOptional()
    @EntityDefinition.field({ label: "Số bài tối thiểu / chu kỳ" })
    minSubmissionsPerCycle?: number;

    @IsInt()
    @IsOptional()
    @EntityDefinition.field({ label: "Số bài tối đa / chu kỳ" })
    maxSubmissionsPerCycle?: number;

    @IsEnum(LibraryType)
    @IsOptional()
    @EntityDefinition.field({
        label: "Thư viện gắn kèm",
        enum: Object.values(LibraryType),
    })
    libraryType?: LibraryType;

    @IsBoolean()
    @IsOptional()
    @EntityDefinition.field({ label: "Cần duyệt" })
    requireReview?: boolean;

    @IsBoolean()
    @IsOptional()
    @EntityDefinition.field({ label: "Có chấm điểm" })
    enableScoring?: boolean;

    /** Thang điểm chấm bài (mặc định 100), tách riêng với điểm phụ cấp */
    @IsPositive()
    @IsOptional()
    @EntityDefinition.field({ label: "Thang điểm chấm bài" })
    maxScore?: number;

    @IsBoolean()
    @IsOptional()
    @EntityDefinition.field({ label: "Cho nộp muộn" })
    allowLateSubmission?: boolean;

    @IsObject()
    @IsOptional()
    @EntityDefinition.field({ label: "Cấu hình thêm" })
    settings?: Record<string, unknown>;

    @IsInt()
    @IsOptional()
    @EntityDefinition.field({ label: "Thứ tự" })
    sortOrder?: number;

    @IsBoolean()
    @IsOptional()
    @EntityDefinition.field({ label: "Đang hoạt động" })
    isActive?: boolean;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Người tạo" })
    createdBy?: string;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Đối tượng được gán" })
    audienceMode?: string;
}

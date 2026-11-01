import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import { IsString, MaxLength } from "class-validator";

export class SubmissionUniqueValue implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Module", required: true })
    moduleId: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Ô nhập", required: true })
    fieldId: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Bài nộp", required: true })
    submissionId: string;

    @IsString()
    @MaxLength(500)
    @EntityDefinition.field({ label: "Giá trị chuẩn hóa", required: true })
    normalizedValue: string;
}

import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import { IsInt, IsString, MaxLength } from "class-validator";

export class MentorPreferenceItem implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Nguyện vọng", required: true })
    preferenceId: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Mentor", required: true })
    mentorId: string;

    @IsInt()
    @EntityDefinition.field({ label: "Thứ tự ưu tiên", required: true })
    priority: number;
}

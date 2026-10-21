import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsDateString,
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";
import { ScheduleLogAction } from "../common/constant";

export class MentoringScheduleLog implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Buổi mentoring", required: true })
    sessionId: string;

    @IsEnum(ScheduleLogAction)
    @EntityDefinition.field({
        label: "Thao tác",
        required: true,
        enum: Object.values(ScheduleLogAction),
    })
    action: ScheduleLogAction;

    @IsDateString()
    @IsOptional()
    @EntityDefinition.field({ label: "Bắt đầu cũ" })
    oldStartAt?: Date;

    @IsDateString()
    @IsOptional()
    @EntityDefinition.field({ label: "Kết thúc cũ" })
    oldEndAt?: Date;

    @IsDateString()
    @IsOptional()
    @EntityDefinition.field({ label: "Bắt đầu mới" })
    newStartAt?: Date;

    @IsDateString()
    @IsOptional()
    @EntityDefinition.field({ label: "Kết thúc mới" })
    newEndAt?: Date;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Người thao tác" })
    actorUserId?: string;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Lý do" })
    reason?: string;
}

import { PartialType } from "@nestjs/swagger";
import { MentorPreferenceItem } from "../entities/mentor-preference-item.entity";

export class MentorPreferenceItemConditionDto extends PartialType(
    MentorPreferenceItem,
) {}

import { OmitType } from "@nestjs/swagger";
import { MentorPreferenceItem } from "../entities/mentor-preference-item.entity";

export class CreateMentorPreferenceItemDto extends OmitType(
    MentorPreferenceItem,
    ["_id"],
) {}

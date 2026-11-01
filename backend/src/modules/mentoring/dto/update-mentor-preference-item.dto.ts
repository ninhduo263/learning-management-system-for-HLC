import { PartialType } from "@nestjs/swagger";
import { CreateMentorPreferenceItemDto } from "./create-mentor-preference-item.dto";

export class UpdateMentorPreferenceItemDto extends PartialType(
    CreateMentorPreferenceItemDto,
) {}

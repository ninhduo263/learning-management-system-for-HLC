import { PartialType } from "@nestjs/swagger";
import { CreateMentorPreferenceDto } from "./create-mentor-preference.dto";

export class UpdateMentorPreferenceDto extends PartialType(
    CreateMentorPreferenceDto,
) {}

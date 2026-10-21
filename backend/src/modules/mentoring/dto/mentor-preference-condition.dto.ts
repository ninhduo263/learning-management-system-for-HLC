import { PartialType } from "@nestjs/swagger";
import { MentorPreference } from "../entities/mentor-preference.entity";

export class MentorPreferenceConditionDto extends PartialType(
    MentorPreference,
) {}

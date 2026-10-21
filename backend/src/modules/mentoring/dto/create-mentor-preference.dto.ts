import { OmitType } from "@nestjs/swagger";
import { MentorPreference } from "../entities/mentor-preference.entity";

export class CreateMentorPreferenceDto extends OmitType(MentorPreference, [
    "_id",
]) {}

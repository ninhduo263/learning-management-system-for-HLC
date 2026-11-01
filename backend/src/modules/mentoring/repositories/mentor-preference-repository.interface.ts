import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { MentorPreference } from "../entities/mentor-preference.entity";

export interface MentorPreferenceRepository
    extends BaseRepository<MentorPreference> {}

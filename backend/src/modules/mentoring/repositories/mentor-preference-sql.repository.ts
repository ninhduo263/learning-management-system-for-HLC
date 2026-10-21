import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { MentorPreference } from "../entities/mentor-preference.entity";
import { MentorPreferenceModel } from "../models/mentor-preference.model";
import { MentorPreferenceRepository } from "./mentor-preference-repository.interface";

export class MentorPreferenceSqlRepository
    extends SqlRepository<MentorPreference>
    implements MentorPreferenceRepository
{
    constructor(
        @InjectModel(MentorPreferenceModel)
        private readonly mentorPreferenceModel: typeof MentorPreferenceModel,
    ) {
        super(mentorPreferenceModel);
    }
}

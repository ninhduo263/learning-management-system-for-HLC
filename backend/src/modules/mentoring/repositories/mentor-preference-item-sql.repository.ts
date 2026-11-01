import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { MentorPreferenceItem } from "../entities/mentor-preference-item.entity";
import { MentorPreferenceItemModel } from "../models/mentor-preference-item.model";
import { MentorPreferenceItemRepository } from "./mentor-preference-item-repository.interface";

export class MentorPreferenceItemSqlRepository
    extends SqlRepository<MentorPreferenceItem>
    implements MentorPreferenceItemRepository
{
    constructor(
        @InjectModel(MentorPreferenceItemModel)
        private readonly mentorPreferenceItemModel: typeof MentorPreferenceItemModel,
    ) {
        super(mentorPreferenceItemModel);
    }
}

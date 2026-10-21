import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { MentoringAward } from "../entities/mentoring-award.entity";
import { MentoringAwardModel } from "../models/mentoring-award.model";
import { MentoringAwardRepository } from "./mentoring-award-repository.interface";

export class MentoringAwardSqlRepository
    extends SqlRepository<MentoringAward>
    implements MentoringAwardRepository
{
    constructor(
        @InjectModel(MentoringAwardModel)
        private readonly mentoringAwardModel: typeof MentoringAwardModel,
    ) {
        super(mentoringAwardModel);
    }
}

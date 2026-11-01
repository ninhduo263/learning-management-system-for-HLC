import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { MentoringQuarter } from "../entities/mentoring-quarter.entity";
import { MentoringQuarterModel } from "../models/mentoring-quarter.model";
import { MentoringQuarterRepository } from "./mentoring-quarter-repository.interface";

export class MentoringQuarterSqlRepository
    extends SqlRepository<MentoringQuarter>
    implements MentoringQuarterRepository
{
    constructor(
        @InjectModel(MentoringQuarterModel)
        private readonly mentoringQuarterModel: typeof MentoringQuarterModel,
    ) {
        super(mentoringQuarterModel);
    }
}

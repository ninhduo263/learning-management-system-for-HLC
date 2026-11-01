import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { MentoringPair } from "../entities/mentoring-pair.entity";
import { MentoringPairModel } from "../models/mentoring-pair.model";
import { MentoringPairRepository } from "./mentoring-pair-repository.interface";

export class MentoringPairSqlRepository
    extends SqlRepository<MentoringPair>
    implements MentoringPairRepository
{
    constructor(
        @InjectModel(MentoringPairModel)
        private readonly mentoringPairModel: typeof MentoringPairModel,
    ) {
        super(mentoringPairModel);
    }
}

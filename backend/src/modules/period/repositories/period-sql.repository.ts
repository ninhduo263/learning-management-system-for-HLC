import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { Period } from "../entities/period.entity";
import { PeriodModel } from "../models/period.model";
import { PeriodRepository } from "./period-repository.interface";

export class PeriodSqlRepository
    extends SqlRepository<Period>
    implements PeriodRepository
{
    constructor(
        @InjectModel(PeriodModel)
        private readonly periodModel: typeof PeriodModel,
    ) {
        super(periodModel);
    }
}

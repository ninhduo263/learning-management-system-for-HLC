import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { MentoringRecap } from "../entities/mentoring-recap.entity";
import { MentoringRecapModel } from "../models/mentoring-recap.model";
import { MentoringRecapRepository } from "./mentoring-recap-repository.interface";

export class MentoringRecapSqlRepository
    extends SqlRepository<MentoringRecap>
    implements MentoringRecapRepository
{
    constructor(
        @InjectModel(MentoringRecapModel)
        private readonly mentoringRecapModel: typeof MentoringRecapModel,
    ) {
        super(mentoringRecapModel);
    }
}

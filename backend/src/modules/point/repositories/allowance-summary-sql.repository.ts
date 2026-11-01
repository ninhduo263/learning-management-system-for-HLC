import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { AllowanceSummary } from "../entities/allowance-summary.entity";
import { AllowanceSummaryModel } from "../models/allowance-summary.model";
import { AllowanceSummaryRepository } from "./allowance-summary-repository.interface";

export class AllowanceSummarySqlRepository
    extends SqlRepository<AllowanceSummary>
    implements AllowanceSummaryRepository
{
    constructor(
        @InjectModel(AllowanceSummaryModel)
        private readonly allowanceSummaryModel: typeof AllowanceSummaryModel,
    ) {
        super(allowanceSummaryModel);
    }
}

import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { PeriodExport } from "../entities/period-export.entity";
import { PeriodExportModel } from "../models/period-export.model";
import { PeriodExportRepository } from "./period-export-repository.interface";

export class PeriodExportSqlRepository
    extends SqlRepository<PeriodExport>
    implements PeriodExportRepository
{
    constructor(
        @InjectModel(PeriodExportModel)
        private readonly periodExportModel: typeof PeriodExportModel,
    ) {
        super(periodExportModel);
    }
}

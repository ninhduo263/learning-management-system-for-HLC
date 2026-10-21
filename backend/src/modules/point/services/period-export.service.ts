import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { PeriodExport } from "../entities/period-export.entity";
import { PeriodExportRepository } from "../repositories/period-export-repository.interface";

@Injectable()
export class PeriodExportService extends BaseService<
    PeriodExport,
    PeriodExportRepository
> {
    constructor(
        @InjectRepository(Entity.PERIOD_EXPORT)
        private readonly periodExportRepository: PeriodExportRepository,
        @InjectTransaction()
        private readonly periodExportTransaction: BaseTransaction,
    ) {
        super(periodExportRepository, {
            notFoundCode: "error-record-not-found",
            transaction: periodExportTransaction,
        });
    }
}

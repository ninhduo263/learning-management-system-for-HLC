import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { PointEntry } from "../entities/point-entry.entity";
import { PointEntryRepository } from "../repositories/point-entry-repository.interface";

@Injectable()
export class PointEntryService extends BaseService<
    PointEntry,
    PointEntryRepository
> {
    constructor(
        @InjectRepository(Entity.POINT_ENTRY)
        private readonly pointEntryRepository: PointEntryRepository,
        @InjectTransaction()
        private readonly pointEntryTransaction: BaseTransaction,
    ) {
        super(pointEntryRepository, {
            notFoundCode: "error-record-not-found",
            transaction: pointEntryTransaction,
        });
    }
}

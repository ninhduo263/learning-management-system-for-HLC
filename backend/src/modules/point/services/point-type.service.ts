import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { PointType } from "../entities/point-type.entity";
import { PointTypeRepository } from "../repositories/point-type-repository.interface";

@Injectable()
export class PointTypeService extends BaseService<
    PointType,
    PointTypeRepository
> {
    constructor(
        @InjectRepository(Entity.POINT_TYPE)
        private readonly pointTypeRepository: PointTypeRepository,
        @InjectTransaction()
        private readonly pointTypeTransaction: BaseTransaction,
    ) {
        super(pointTypeRepository, {
            notFoundCode: "error-record-not-found",
            transaction: pointTypeTransaction,
        });
    }
}

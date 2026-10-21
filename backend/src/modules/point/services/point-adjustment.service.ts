import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { PointAdjustment } from "../entities/point-adjustment.entity";
import { PointAdjustmentRepository } from "../repositories/point-adjustment-repository.interface";

@Injectable()
export class PointAdjustmentService extends BaseService<
    PointAdjustment,
    PointAdjustmentRepository
> {
    constructor(
        @InjectRepository(Entity.POINT_ADJUSTMENT)
        private readonly pointAdjustmentRepository: PointAdjustmentRepository,
        @InjectTransaction()
        private readonly pointAdjustmentTransaction: BaseTransaction,
    ) {
        super(pointAdjustmentRepository, {
            notFoundCode: "error-record-not-found",
            transaction: pointAdjustmentTransaction,
        });
    }
}

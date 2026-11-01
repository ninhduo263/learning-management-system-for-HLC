import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { Position } from "../entities/position.entity";
import { PositionRepository } from "../repositories/position-repository.interface";

@Injectable()
export class PositionService extends BaseService<Position, PositionRepository> {
    constructor(
        @InjectRepository(Entity.POSITION)
        private readonly positionRepository: PositionRepository,
        @InjectTransaction()
        private readonly positionTransaction: BaseTransaction,
    ) {
        super(positionRepository, {
            notFoundCode: "error-record-not-found",
            transaction: positionTransaction,
        });
    }
}

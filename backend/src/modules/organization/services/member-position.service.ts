import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { MemberPosition } from "../entities/member-position.entity";
import { MemberPositionRepository } from "../repositories/member-position-repository.interface";

@Injectable()
export class MemberPositionService extends BaseService<
    MemberPosition,
    MemberPositionRepository
> {
    constructor(
        @InjectRepository(Entity.MEMBER_POSITION)
        private readonly memberPositionRepository: MemberPositionRepository,
        @InjectTransaction()
        private readonly memberPositionTransaction: BaseTransaction,
    ) {
        super(memberPositionRepository, {
            notFoundCode: "error-record-not-found",
            transaction: memberPositionTransaction,
        });
    }
}

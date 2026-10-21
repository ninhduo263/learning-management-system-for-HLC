import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { Member } from "../entities/member.entity";
import { MemberRepository } from "../repositories/member-repository.interface";

@Injectable()
export class MemberService extends BaseService<Member, MemberRepository> {
    constructor(
        @InjectRepository(Entity.MEMBER)
        private readonly memberRepository: MemberRepository,
        @InjectTransaction()
        private readonly memberTransaction: BaseTransaction,
    ) {
        super(memberRepository, {
            notFoundCode: "error-record-not-found",
            transaction: memberTransaction,
        });
    }
}

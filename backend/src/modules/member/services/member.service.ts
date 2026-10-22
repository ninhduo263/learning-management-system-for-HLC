import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { MemberModel } from "../models/member.model";
import { MemberProfileService } from "./member-profile.service";
import { Member } from "../entities/member.entity";
import { MemberRepository } from "../repositories/member-repository.interface";

@Injectable()
export class MemberService extends BaseService<Member, MemberRepository> {
    constructor(
        @InjectRepository(Entity.MEMBER)
        private readonly memberRepository: MemberRepository,
        @InjectTransaction()
        private readonly memberTransaction: BaseTransaction,
        private readonly profileService: MemberProfileService,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
    ) {
        super(memberRepository, {
            notFoundCode: "error-record-not-found",
            transaction: memberTransaction,
        });
    }

    /** Sửa qua CRUD (PUT /member/:id) cũng ghi lịch sử hồ sơ */
    async updateById(
        user: User,
        id: string,
        update: Parameters<
            BaseService<Member, MemberRepository>["updateById"]
        >[2],
        query?: Parameters<
            BaseService<Member, MemberRepository>["updateById"]
        >[3],
    ) {
        const before = await this.memberModel.findByPk(id, { raw: true });
        const result = await super.updateById(user, id, update, query);
        if (before && result)
            await this.profileService.logChanges(
                before,
                update as Record<string, unknown>,
                user,
                "ADMIN",
            );
        return result;
    }
}

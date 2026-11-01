import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { Member } from "../entities/member.entity";
import { MemberModel } from "../models/member.model";
import { MemberRepository } from "./member-repository.interface";

export class MemberSqlRepository
    extends SqlRepository<Member>
    implements MemberRepository
{
    constructor(
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
    ) {
        super(memberModel);
    }
}

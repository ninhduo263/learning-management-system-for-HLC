import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { MemberPosition } from "../entities/member-position.entity";
import { MemberPositionModel } from "../models/member-position.model";
import { MemberPositionRepository } from "./member-position-repository.interface";

export class MemberPositionSqlRepository
    extends SqlRepository<MemberPosition>
    implements MemberPositionRepository
{
    constructor(
        @InjectModel(MemberPositionModel)
        private readonly memberPositionModel: typeof MemberPositionModel,
    ) {
        super(memberPositionModel);
    }
}

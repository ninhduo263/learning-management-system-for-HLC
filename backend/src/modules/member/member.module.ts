import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { TransactionProvider } from "@module/repository/common/transaction";
import { SqlTransaction } from "@module/repository/sequelize/sql.transaction";
import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { MemberController } from "./controllers/member.controller";
import { MemberModel } from "./models/member.model";
import { MemberSqlRepository } from "./repositories/member-sql.repository";
import { MemberProfileLogModel } from "./models/member-profile-log.model";
import { MemberProfileService } from "./services/member-profile.service";
import { MemberToolsService } from "./services/member-tools.service";
import { MemberService } from "./services/member.service";

@Module({
    imports: [SequelizeModule.forFeature([MemberModel, MemberProfileLogModel])],
    controllers: [MemberController],
    providers: [
        MemberService,
        MemberToolsService,
        MemberProfileService,
        RepositoryProvider(Entity.MEMBER, MemberSqlRepository),
        SqlTransaction,
        TransactionProvider(SqlTransaction),
    ],
    exports: [MemberService, MemberProfileService],
})
export class MemberModule {}

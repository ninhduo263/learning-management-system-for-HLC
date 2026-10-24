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
import { MemberExportService } from "./services/member-export.service";
import { ProvinceService } from "./services/province.service";
import { MemberExportController } from "./controllers/member-export.controller";
import { ProvinceController } from "./controllers/province.controller";
import { MemberAdminController } from "./controllers/member-admin.controller";
import { MemberDirectoryController } from "./controllers/member-directory.controller";
import { MemberAdminService } from "./services/member-admin.service";

@Module({
    imports: [SequelizeModule.forFeature([MemberModel, MemberProfileLogModel])],
    controllers: [
        MemberController,
        ProvinceController,
        MemberExportController,
        MemberAdminController,
        MemberDirectoryController,
    ],
    providers: [
        MemberService,
        MemberToolsService,
        MemberProfileService,
        ProvinceService,
        MemberExportService,
        MemberAdminService,
        RepositoryProvider(Entity.MEMBER, MemberSqlRepository),
        SqlTransaction,
        TransactionProvider(SqlTransaction),
    ],
    exports: [MemberService, MemberProfileService, ProvinceService],
})
export class MemberModule {}

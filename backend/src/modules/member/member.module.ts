import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { TransactionProvider } from "@module/repository/common/transaction";
import { SqlTransaction } from "@module/repository/sequelize/sql.transaction";
import { Global, Module } from "@nestjs/common";
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
import { ProfileApprovalController } from "./controllers/profile-approval.controller";
import { ProfileApprovalService } from "./services/profile-approval.service";
import { BankHistoryService } from "./services/bank-history.service";
import { MemberAdminService } from "./services/member-admin.service";

/** Global: bảng phụ cấp dùng thông tin ngân hàng theo kỳ (BankHistoryService) */
@Global()
@Module({
    imports: [SequelizeModule.forFeature([MemberModel, MemberProfileLogModel])],
    controllers: [
        MemberController,
        ProvinceController,
        MemberExportController,
        MemberAdminController,
        MemberDirectoryController,
        ProfileApprovalController,
    ],
    providers: [
        MemberService,
        MemberToolsService,
        MemberProfileService,
        ProvinceService,
        MemberExportService,
        MemberAdminService,
        ProfileApprovalService,
        BankHistoryService,
        RepositoryProvider(Entity.MEMBER, MemberSqlRepository),
        SqlTransaction,
        TransactionProvider(SqlTransaction),
    ],
    exports: [
        MemberService,
        MemberProfileService,
        ProvinceService,
        BankHistoryService,
    ],
})
export class MemberModule {}

import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { TransactionProvider } from "@module/repository/common/transaction";
import { SqlTransaction } from "@module/repository/sequelize/sql.transaction";
import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { PointTypeController } from "./controllers/point-type.controller";
import { PointTypeModel } from "./models/point-type.model";
import { PointTypeSqlRepository } from "./repositories/point-type-sql.repository";
import { PointTypeService } from "./services/point-type.service";
import { PointRuleController } from "./controllers/point-rule.controller";
import { PointRuleModel } from "./models/point-rule.model";
import { PointRuleSqlRepository } from "./repositories/point-rule-sql.repository";
import { PointRuleService } from "./services/point-rule.service";
import { PointAdjustmentController } from "./controllers/point-adjustment.controller";
import { PointAdjustmentModel } from "./models/point-adjustment.model";
import { PointAdjustmentSqlRepository } from "./repositories/point-adjustment-sql.repository";
import { PointAdjustmentService } from "./services/point-adjustment.service";
import { PointEntryController } from "./controllers/point-entry.controller";
import { PointEntryModel } from "./models/point-entry.model";
import { PointEntrySqlRepository } from "./repositories/point-entry-sql.repository";
import { PointEntryService } from "./services/point-entry.service";
import { AllowanceSummaryController } from "./controllers/allowance-summary.controller";
import { AllowanceSummaryModel } from "./models/allowance-summary.model";
import { AllowanceSummarySqlRepository } from "./repositories/allowance-summary-sql.repository";
import { AllowanceSummaryService } from "./services/allowance-summary.service";
import { PeriodExportController } from "./controllers/period-export.controller";
import { PeriodExportModel } from "./models/period-export.model";
import { PeriodExportSqlRepository } from "./repositories/period-export-sql.repository";
import { PeriodExportService } from "./services/period-export.service";
import { CatalogSeedService } from "./flow/catalog-seed.service";
import { PointAdminController } from "./flow/point-admin.controller";
import { PointCalculationService } from "./flow/point-calculation.service";
import { PointFlowService } from "./flow/point-flow.service";
import { PointMemberController } from "./flow/point-member.controller";

@Module({
    imports: [
        SequelizeModule.forFeature([
            PointTypeModel,
            PointRuleModel,
            PointAdjustmentModel,
            PointEntryModel,
            AllowanceSummaryModel,
            PeriodExportModel,
        ]),
    ],
    controllers: [
        PointAdminController,
        PointMemberController,
        PointTypeController,
        PointRuleController,
        PointAdjustmentController,
        PointEntryController,
        AllowanceSummaryController,
        PeriodExportController,
    ],
    providers: [
        CatalogSeedService,
        PointCalculationService,
        PointFlowService,
        PointTypeService,
        PointRuleService,
        PointAdjustmentService,
        PointEntryService,
        AllowanceSummaryService,
        PeriodExportService,
        RepositoryProvider(Entity.POINT_TYPE, PointTypeSqlRepository),
        RepositoryProvider(Entity.POINT_RULE, PointRuleSqlRepository),
        RepositoryProvider(
            Entity.POINT_ADJUSTMENT,
            PointAdjustmentSqlRepository,
        ),
        RepositoryProvider(Entity.POINT_ENTRY, PointEntrySqlRepository),
        RepositoryProvider(
            Entity.ALLOWANCE_SUMMARY,
            AllowanceSummarySqlRepository,
        ),
        RepositoryProvider(Entity.PERIOD_EXPORT, PeriodExportSqlRepository),
        SqlTransaction,
        TransactionProvider(SqlTransaction),
    ],
    exports: [
        PointFlowService,
        PointTypeService,
        PointRuleService,
        PointAdjustmentService,
        PointEntryService,
        AllowanceSummaryService,
        PeriodExportService,
    ],
})
export class PointModule {}

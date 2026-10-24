import { ModuleAudienceService } from "./flow/module-audience.service";
import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { TransactionProvider } from "@module/repository/common/transaction";
import { SqlTransaction } from "@module/repository/sequelize/sql.transaction";
import { Global, Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { LearningFlowController } from "./flow/learning-flow.controller";
import { LearningFlowService } from "./flow/learning-flow.service";
import { LibraryExcelService } from "./flow/library-excel.service";
import { LibraryItemController } from "./controllers/library-item.controller";
import { LibraryItemModel } from "./models/library-item.model";
import { LibraryItemSqlRepository } from "./repositories/library-item-sql.repository";
import { LibraryItemService } from "./services/library-item.service";
import { LearningModuleController } from "./controllers/learning-module.controller";
import { LearningModuleModel } from "./models/learning-module.model";
import { LearningModuleSqlRepository } from "./repositories/learning-module-sql.repository";
import { LearningModuleService } from "./services/learning-module.service";
import { ModuleFieldController } from "./controllers/module-field.controller";
import { ModuleFieldModel } from "./models/module-field.model";
import { ModuleFieldSqlRepository } from "./repositories/module-field-sql.repository";
import { ModuleFieldService } from "./services/module-field.service";
import { ModuleCriterionController } from "./controllers/module-criterion.controller";
import { ModuleCriterionModel } from "./models/module-criterion.model";
import { ModuleCriterionSqlRepository } from "./repositories/module-criterion-sql.repository";
import { ModuleCriterionService } from "./services/module-criterion.service";
import { ModuleAssignmentController } from "./controllers/module-assignment.controller";
import { ModuleAssignmentModel } from "./models/module-assignment.model";
import { ModuleAssignmentSqlRepository } from "./repositories/module-assignment-sql.repository";
import { ModuleAssignmentService } from "./services/module-assignment.service";
import { SubmissionController } from "./controllers/submission.controller";
import { SubmissionModel } from "./models/submission.model";
import { SubmissionSqlRepository } from "./repositories/submission-sql.repository";
import { SubmissionService } from "./services/submission.service";
import { SubmissionUniqueValueController } from "./controllers/submission-unique-value.controller";
import { SubmissionUniqueValueModel } from "./models/submission-unique-value.model";
import { SubmissionUniqueValueSqlRepository } from "./repositories/submission-unique-value-sql.repository";
import { SubmissionUniqueValueService } from "./services/submission-unique-value.service";
import { SubmissionScoreController } from "./controllers/submission-score.controller";
import { SubmissionScoreModel } from "./models/submission-score.model";
import { SubmissionScoreSqlRepository } from "./repositories/submission-score-sql.repository";
import { SubmissionScoreService } from "./services/submission-score.service";

/** Global: các dịch vụ khác (điểm, Leader) dùng chung cách xác định đối tượng module */
@Global()
@Module({
    imports: [
        SequelizeModule.forFeature([
            LibraryItemModel,
            LearningModuleModel,
            ModuleFieldModel,
            ModuleCriterionModel,
            ModuleAssignmentModel,
            SubmissionModel,
            SubmissionUniqueValueModel,
            SubmissionScoreModel,
        ]),
    ],
    controllers: [
        LearningFlowController,
        LibraryItemController,
        LearningModuleController,
        ModuleFieldController,
        ModuleCriterionController,
        ModuleAssignmentController,
        SubmissionController,
        SubmissionUniqueValueController,
        SubmissionScoreController,
    ],
    providers: [
        ModuleAudienceService,
        LearningFlowService,
        LibraryExcelService,
        LibraryItemService,
        LearningModuleService,
        ModuleFieldService,
        ModuleCriterionService,
        ModuleAssignmentService,
        SubmissionService,
        SubmissionUniqueValueService,
        SubmissionScoreService,
        RepositoryProvider(Entity.LIBRARY_ITEM, LibraryItemSqlRepository),
        RepositoryProvider(Entity.LEARNING_MODULE, LearningModuleSqlRepository),
        RepositoryProvider(Entity.MODULE_FIELD, ModuleFieldSqlRepository),
        RepositoryProvider(
            Entity.MODULE_CRITERION,
            ModuleCriterionSqlRepository,
        ),
        RepositoryProvider(
            Entity.MODULE_ASSIGNMENT,
            ModuleAssignmentSqlRepository,
        ),
        RepositoryProvider(Entity.SUBMISSION, SubmissionSqlRepository),
        RepositoryProvider(
            Entity.SUBMISSION_UNIQUE_VALUE,
            SubmissionUniqueValueSqlRepository,
        ),
        RepositoryProvider(
            Entity.SUBMISSION_SCORE,
            SubmissionScoreSqlRepository,
        ),
        SqlTransaction,
        TransactionProvider(SqlTransaction),
    ],
    exports: [
        ModuleAudienceService,
        LearningFlowService,
        LibraryItemService,
        LearningModuleService,
        ModuleFieldService,
        ModuleCriterionService,
        ModuleAssignmentService,
        SubmissionService,
        SubmissionUniqueValueService,
        SubmissionScoreService,
    ],
})
export class LearningActivityModule {}

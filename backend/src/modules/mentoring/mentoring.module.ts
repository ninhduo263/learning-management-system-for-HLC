import { MentoringSuggestService } from "./flow/mentoring-suggest.service";
import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { TransactionProvider } from "@module/repository/common/transaction";
import { SqlTransaction } from "@module/repository/sequelize/sql.transaction";
import { Module } from "@nestjs/common";
import { MentoringAdminController } from "./flow/mentoring-admin.controller";
import { MentoringExcelService } from "./flow/mentoring-excel.service";
import { MentoringFlowService } from "./flow/mentoring-flow.service";
import { RecapScoreService } from "./flow/recap-score.service";
import { MentoringHistoryService } from "./flow/mentoring-history.service";
import { MentoringImportBatchModel } from "./models/mentoring-import-batch.model";
import { MentoringMemberController } from "./flow/mentoring-member.controller";
import { SequelizeModule } from "@nestjs/sequelize";
import { MentoringQuarterController } from "./controllers/mentoring-quarter.controller";
import { MentoringQuarterModel } from "./models/mentoring-quarter.model";
import { MentoringQuarterSqlRepository } from "./repositories/mentoring-quarter-sql.repository";
import { MentoringQuarterService } from "./services/mentoring-quarter.service";
import { MentorPreferenceController } from "./controllers/mentor-preference.controller";
import { MentorPreferenceModel } from "./models/mentor-preference.model";
import { MentorPreferenceSqlRepository } from "./repositories/mentor-preference-sql.repository";
import { MentorPreferenceService } from "./services/mentor-preference.service";
import { MentorPreferenceItemController } from "./controllers/mentor-preference-item.controller";
import { MentorPreferenceItemModel } from "./models/mentor-preference-item.model";
import { MentorPreferenceItemSqlRepository } from "./repositories/mentor-preference-item-sql.repository";
import { MentorPreferenceItemService } from "./services/mentor-preference-item.service";
import { MentoringPairController } from "./controllers/mentoring-pair.controller";
import { MentoringPairModel } from "./models/mentoring-pair.model";
import { MentoringPairSqlRepository } from "./repositories/mentoring-pair-sql.repository";
import { MentoringPairService } from "./services/mentoring-pair.service";
import { MentoringSessionController } from "./controllers/mentoring-session.controller";
import { MentoringSessionModel } from "./models/mentoring-session.model";
import { MentoringSessionSqlRepository } from "./repositories/mentoring-session-sql.repository";
import { MentoringSessionService } from "./services/mentoring-session.service";
import { MentoringScheduleLogController } from "./controllers/mentoring-schedule-log.controller";
import { MentoringScheduleLogModel } from "./models/mentoring-schedule-log.model";
import { MentoringScheduleLogSqlRepository } from "./repositories/mentoring-schedule-log-sql.repository";
import { MentoringScheduleLogService } from "./services/mentoring-schedule-log.service";
import { MentoringRecapController } from "./controllers/mentoring-recap.controller";
import { MentoringRecapModel } from "./models/mentoring-recap.model";
import { MentoringRecapSqlRepository } from "./repositories/mentoring-recap-sql.repository";
import { MentoringRecapService } from "./services/mentoring-recap.service";
import { MentoringAwardController } from "./controllers/mentoring-award.controller";
import { MentoringAwardModel } from "./models/mentoring-award.model";
import { MentoringAwardSqlRepository } from "./repositories/mentoring-award-sql.repository";
import { MentoringAwardService } from "./services/mentoring-award.service";

@Module({
    imports: [
        SequelizeModule.forFeature([
            MentoringQuarterModel,
            MentorPreferenceModel,
            MentorPreferenceItemModel,
            MentoringPairModel,
            MentoringSessionModel,
            MentoringScheduleLogModel,
            MentoringRecapModel,
            MentoringAwardModel,
            MentoringImportBatchModel,
        ]),
    ],
    controllers: [
        MentoringAdminController,
        MentoringMemberController,
        MentoringQuarterController,
        MentorPreferenceController,
        MentorPreferenceItemController,
        MentoringPairController,
        MentoringSessionController,
        MentoringScheduleLogController,
        MentoringRecapController,
        MentoringAwardController,
    ],
    providers: [
        MentoringSuggestService,
        MentoringFlowService,
        RecapScoreService,
        MentoringHistoryService,
        MentoringExcelService,
        MentoringQuarterService,
        MentorPreferenceService,
        MentorPreferenceItemService,
        MentoringPairService,
        MentoringSessionService,
        MentoringScheduleLogService,
        MentoringRecapService,
        MentoringAwardService,
        RepositoryProvider(
            Entity.MENTORING_QUARTER,
            MentoringQuarterSqlRepository,
        ),
        RepositoryProvider(
            Entity.MENTOR_PREFERENCE,
            MentorPreferenceSqlRepository,
        ),
        RepositoryProvider(
            Entity.MENTOR_PREFERENCE_ITEM,
            MentorPreferenceItemSqlRepository,
        ),
        RepositoryProvider(Entity.MENTORING_PAIR, MentoringPairSqlRepository),
        RepositoryProvider(
            Entity.MENTORING_SESSION,
            MentoringSessionSqlRepository,
        ),
        RepositoryProvider(
            Entity.MENTORING_SCHEDULE_LOG,
            MentoringScheduleLogSqlRepository,
        ),
        RepositoryProvider(Entity.MENTORING_RECAP, MentoringRecapSqlRepository),
        RepositoryProvider(Entity.MENTORING_AWARD, MentoringAwardSqlRepository),
        SqlTransaction,
        TransactionProvider(SqlTransaction),
    ],
    exports: [
        MentoringFlowService,
        RecapScoreService,
        MentoringQuarterService,
        MentorPreferenceService,
        MentorPreferenceItemService,
        MentoringPairService,
        MentoringSessionService,
        MentoringScheduleLogService,
        MentoringRecapService,
        MentoringAwardService,
    ],
})
export class MentoringModule {}

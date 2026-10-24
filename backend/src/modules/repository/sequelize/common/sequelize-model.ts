import { EventAccount } from "@module/event-account/entities/event-account.entity";
import { Event } from "@module/event/entities/event.entity";
import { EventLog } from "@module/event-log/entities/event-log.entity";
import { HamSinhMaModel } from "@module/quy-tac-ma/models/ham-sinh-ma.model";
import { QuyTacMaModel } from "@module/quy-tac-ma/models/quy-tac-ma.model";
import { MemberModel } from "@module/member/models/member.model";
import { DepartmentModel } from "@module/organization/models/department.model";
import { PositionModel } from "@module/organization/models/position.model";
import { MemberPositionModel } from "@module/organization/models/member-position.model";
import { GroupMembershipModel } from "@module/organization/models/group-membership.model";
import { MemberProfileLogModel } from "@module/member/models/member-profile-log.model";
import { FundContributorModel } from "@module/fund/models/fund-contributor.model";
import { FundExpenseModel } from "@module/fund/models/fund-expense.model";
import { MentoringImportBatchModel } from "@module/mentoring/models/mentoring-import-batch.model";
import { PeriodLogModel } from "@module/period/models/period-log.model";
import { ActivityLogModel } from "@module/activity-log/activity-log.model";
import { GroupDelegationModel } from "@module/organization/models/group-delegation.model";
import { ModuleAudienceModel } from "@module/learning/models/module-audience.model";
import { ProvinceModel } from "@module/member/models/province.model";
import { ProposalModel } from "@module/proposal/models/proposal.model";
import { RecapDelegationModel } from "@module/mentoring/models/recap-delegation.model";
import { GroupKindConfigModel } from "@module/organization/models/group-kind-config.model";
import { MentoringPairLogModel } from "@module/mentoring/models/mentoring-pair-log.model";
import { PeriodModel } from "@module/period/models/period.model";
import { AttachmentModel } from "@module/attachment/models/attachment.model";
import { MentoringQuarterModel } from "@module/mentoring/models/mentoring-quarter.model";
import { MentorPreferenceModel } from "@module/mentoring/models/mentor-preference.model";
import { MentorPreferenceItemModel } from "@module/mentoring/models/mentor-preference-item.model";
import { MentoringPairModel } from "@module/mentoring/models/mentoring-pair.model";
import { MentoringSessionModel } from "@module/mentoring/models/mentoring-session.model";
import { MentoringScheduleLogModel } from "@module/mentoring/models/mentoring-schedule-log.model";
import { MentoringRecapModel } from "@module/mentoring/models/mentoring-recap.model";
import { MentoringAwardModel } from "@module/mentoring/models/mentoring-award.model";
import { LibraryItemModel } from "@module/learning/models/library-item.model";
import { LearningModuleModel } from "@module/learning/models/learning-module.model";
import { ModuleFieldModel } from "@module/learning/models/module-field.model";
import { ModuleCriterionModel } from "@module/learning/models/module-criterion.model";
import { ModuleAssignmentModel } from "@module/learning/models/module-assignment.model";
import { SubmissionModel } from "@module/learning/models/submission.model";
import { SubmissionUniqueValueModel } from "@module/learning/models/submission-unique-value.model";
import { SubmissionScoreModel } from "@module/learning/models/submission-score.model";
import { FundContributionModel } from "@module/fund/models/fund-contribution.model";
import { PointTypeModel } from "@module/point/models/point-type.model";
import { PointRuleModel } from "@module/point/models/point-rule.model";
import { PointAdjustmentModel } from "@module/point/models/point-adjustment.model";
import { PointEntryModel } from "@module/point/models/point-entry.model";
import { AllowanceSummaryModel } from "@module/point/models/allowance-summary.model";
import { PeriodExportModel } from "@module/point/models/period-export.model";
import { AdminPermissionModel } from "@module/permission/models/admin-permission.model";
import { Model, ModelCtor } from "sequelize-typescript";
import { AuditLogModel } from "../model/audit-log.model";
import { AuthModel } from "../model/auth.model";
import { DataPartitionUserModel } from "../model/data-partition-user.model";
import { DataPartitionModel } from "../model/data-partition.model";
import { FileModel } from "../model/file.model";
import { IncrementModel } from "../model/increment.model";
import { NotificationModel } from "../model/notification.model";
import { OneSignalUserModel } from "../model/one-signal-user.model";
import { SettingModel } from "../model/setting.model";
import TopicModel from "../model/topic.model";
import { UserTopicModel } from "../model/user-topic.model";
import { UserModel } from "../model/user.model";

export const SequelizeModel: ModelCtor<Model>[] = [
    UserModel,
    AuthModel,
    Event,
    EventAccount,
    EventLog,
    FileModel,
    NotificationModel,
    OneSignalUserModel,
    TopicModel,
    UserTopicModel,
    SettingModel,
    IncrementModel,
    QuyTacMaModel,
    HamSinhMaModel,
    AuditLogModel,
    DataPartitionModel,
    DataPartitionUserModel,
    MemberModel,
    DepartmentModel,
    PositionModel,
    MemberPositionModel,
    PeriodModel,
    AttachmentModel,
    MentoringQuarterModel,
    MentorPreferenceModel,
    MentorPreferenceItemModel,
    MentoringPairModel,
    MentoringSessionModel,
    MentoringScheduleLogModel,
    MentoringRecapModel,
    MentoringAwardModel,
    LibraryItemModel,
    LearningModuleModel,
    ModuleFieldModel,
    ModuleCriterionModel,
    ModuleAssignmentModel,
    SubmissionModel,
    SubmissionUniqueValueModel,
    SubmissionScoreModel,
    FundContributionModel,
    PointTypeModel,
    PointRuleModel,
    PointAdjustmentModel,
    PointEntryModel,
    AllowanceSummaryModel,
    PeriodExportModel,
    AdminPermissionModel,
    GroupMembershipModel,
    MemberProfileLogModel,
    FundContributorModel,
    FundExpenseModel,
    MentoringImportBatchModel,
    PeriodLogModel,
    GroupKindConfigModel,
    MentoringPairLogModel,
    ActivityLogModel,
    GroupDelegationModel,
    ModuleAudienceModel,
    ProvinceModel,
    ProposalModel,
    RecapDelegationModel,
];

import { DefaultModules, DefaultProviders } from "@config/module/config";
import { AuditLogModule } from "@module/audit-log/audit-log.module";
import { IncrementModule } from "@module/increment/increment.module";
import { RedisModule } from "@module/redis/redis.module";
import { SsoModule } from "@module/sso/sso.module";
import { Module } from "@nestjs/common";
import { MemberModule } from "./modules/member/member.module";
import { OrganizationModule } from "./modules/organization/organization.module";
import { PeriodModule } from "./modules/period/period.module";
import { AttachmentModule } from "./modules/attachment/attachment.module";
import { MentoringModule } from "./modules/mentoring/mentoring.module";
import { LearningActivityModule } from "./modules/learning/learning.module";
import { FundModule } from "./modules/fund/fund.module";
import { PointModule } from "./modules/point/point.module";
import { PermissionModule } from "./modules/permission/permission.module";
import { TimeModule } from "./modules/time/time.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { LeaderModule } from "./modules/leader/leader.module";
import { ActivityLogModule } from "./modules/activity-log/activity-log.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { ProposalModule } from "./modules/proposal/proposal.module";
import { AppController } from "./app.controller";
import { RootController } from "./root.controller";
import { AuthModule } from "./modules/auth/auth.module";
import { CommonProviderModule } from "./modules/common-provider/common-provider.module";
import { DataPartitionModule } from "./modules/data-partition/data-partition.module";
import { DataProcessModule } from "./modules/data-process/data-process.module";
import { FileModule } from "./modules/file/file.module";
import { ImportSessionModule } from "./modules/import-session/import-session.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { OneSignalModule } from "./modules/one-signal/one-signal.module";
import { QuyTacMaModule } from "./modules/quy-tac-ma/quy-tac-ma.module";
import { SettingModule } from "./modules/setting/setting.module";
import { TopicModule } from "./modules/topic/topic.module";
import { UserModule } from "./modules/user/user.module";

@Module({
    imports: [
        ...DefaultModules,
        AuthModule,
        UserModule,
        OneSignalModule,
        NotificationModule,
        TopicModule,
        FileModule,
        SettingModule,
        RedisModule,
        SsoModule,
        IncrementModule,
        ImportSessionModule,
        QuyTacMaModule,
        AuditLogModule,
        DataProcessModule,
        DataPartitionModule,
        CommonProviderModule,
        // Đã gỡ EventAccountModule, EventModule, EventLogModule, WebSocketModule: bộ mẫu check-in sự kiện của khung dự án,
        // HLC không dùng và các controller này không có kiểm tra quyền (ai cũng ghi / xóa được).
        MemberModule,
        OrganizationModule,
        PeriodModule,
        AttachmentModule,
        MentoringModule,
        LearningActivityModule,
        FundModule,
        PointModule,
        PermissionModule,
        TimeModule,
        DashboardModule,
        LeaderModule,
        ActivityLogModule,
        CatalogModule,
        ProposalModule,
    ],
    providers: [...DefaultProviders],
    controllers: [AppController, RootController],
})
export class AppModule {}

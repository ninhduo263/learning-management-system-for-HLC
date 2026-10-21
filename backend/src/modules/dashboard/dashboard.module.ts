import { FundModule } from "@module/fund/fund.module";
import { LearningActivityModule } from "@module/learning/learning.module";
import { PointModule } from "@module/point/point.module";
import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
    imports: [PointModule, FundModule, LearningActivityModule],
    controllers: [DashboardController],
    providers: [DashboardService],
})
export class DashboardModule {}

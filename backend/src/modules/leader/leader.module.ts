import { MentoringModule } from "@module/mentoring/mentoring.module";
import { PointModule } from "@module/point/point.module";
import { Module } from "@nestjs/common";
import { LeaderController } from "./leader.controller";
import { LeaderService } from "./leader.service";

@Module({
    imports: [MentoringModule, PointModule],
    controllers: [LeaderController],
    providers: [LeaderService],
})
export class LeaderModule {}

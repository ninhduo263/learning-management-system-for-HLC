import { MentoringModule } from "@module/mentoring/mentoring.module";
import { Module } from "@nestjs/common";
import { LeaderController } from "./leader.controller";
import { LeaderService } from "./leader.service";

@Module({
    imports: [MentoringModule],
    controllers: [LeaderController],
    providers: [LeaderService],
})
export class LeaderModule {}

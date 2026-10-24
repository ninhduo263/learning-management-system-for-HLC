import { Module } from "@nestjs/common";
import { MentoringModule } from "@module/mentoring/mentoring.module";
import { PointModule } from "@module/point/point.module";
import { ProposalController } from "./proposal.controller";
import { ProposalService } from "./proposal.service";

@Module({
    imports: [MentoringModule, PointModule],
    controllers: [ProposalController],
    providers: [ProposalService],
    exports: [ProposalService],
})
export class ProposalModule {}

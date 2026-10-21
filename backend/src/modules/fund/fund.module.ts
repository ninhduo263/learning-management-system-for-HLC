import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { TransactionProvider } from "@module/repository/common/transaction";
import { SqlTransaction } from "@module/repository/sequelize/sql.transaction";
import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { FundContributionController } from "./controllers/fund-contribution.controller";
import { FundContributionModel } from "./models/fund-contribution.model";
import { FundContributionSqlRepository } from "./repositories/fund-contribution-sql.repository";
import { FundContributionService } from "./services/fund-contribution.service";
import { FundFlowController } from "./flow/fund-flow.controller";
import { FundFlowService } from "./flow/fund-flow.service";

@Module({
    imports: [SequelizeModule.forFeature([FundContributionModel])],
    controllers: [FundFlowController, FundContributionController],
    providers: [
        FundFlowService,
        FundContributionService,
        RepositoryProvider(
            Entity.FUND_CONTRIBUTION,
            FundContributionSqlRepository,
        ),
        SqlTransaction,
        TransactionProvider(SqlTransaction),
    ],
    exports: [FundContributionService, FundFlowService],
})
export class FundModule {}

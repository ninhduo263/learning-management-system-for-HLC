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

@Module({
    imports: [SequelizeModule.forFeature([FundContributionModel])],
    controllers: [FundContributionController],
    providers: [
        FundContributionService,
        RepositoryProvider(
            Entity.FUND_CONTRIBUTION,
            FundContributionSqlRepository,
        ),
        SqlTransaction,
        TransactionProvider(SqlTransaction),
    ],
    exports: [FundContributionService],
})
export class FundModule {}

import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { TransactionProvider } from "@module/repository/common/transaction";
import { SqlTransaction } from "@module/repository/sequelize/sql.transaction";
import { Global, Module } from "@nestjs/common";
import { PeriodFlowService } from "./flow/period-flow.service";
import { SequelizeModule } from "@nestjs/sequelize";
import { PeriodController } from "./controllers/period.controller";
import { PeriodModel } from "./models/period.model";
import { PeriodSqlRepository } from "./repositories/period-sql.repository";
import { PeriodService } from "./services/period.service";

@Global()
@Module({
    imports: [SequelizeModule.forFeature([PeriodModel])],
    controllers: [PeriodController],
    providers: [
        PeriodService,
        PeriodFlowService,
        RepositoryProvider(Entity.PERIOD, PeriodSqlRepository),
        SqlTransaction,
        TransactionProvider(SqlTransaction),
    ],
    exports: [PeriodService, PeriodFlowService],
})
export class PeriodModule {}

import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { EventLogController } from "./controllers/event-log.controller";
import { EventLogService } from "./services/event-log.service";
import { EventLog } from "./entities/event-log.entity";
import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { TransactionProvider } from "@module/repository/common/transaction";
import { SqlTransaction } from "@module/repository/sequelize/sql.transaction";
import { EventLogRepositoryImpl } from "./repository/event-log.repository";

@Module({
    imports: [SequelizeModule.forFeature([EventLog])],
    controllers: [EventLogController],
    providers: [
        EventLogService,
        RepositoryProvider(Entity.EVENT_LOG, EventLogRepositoryImpl),
        TransactionProvider(SqlTransaction),
    ],
    exports: [EventLogService],
})
export class EventLogModule {}

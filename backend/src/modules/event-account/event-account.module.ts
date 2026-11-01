import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { TransactionProvider } from "@module/repository/common/transaction";
import { SqlTransaction } from "@module/repository/sequelize/sql.transaction";
import { EventAccount } from "./entities/event-account.entity";
import { EventAccountService } from "./services/event-account.service";
import { EventAccountController } from "./controller/event-account.controller";
import { EventAccountRepositoryImpl } from "./repository/event-account.repository";

@Module({
    imports: [SequelizeModule.forFeature([EventAccount])],
    controllers: [EventAccountController],
    providers: [
        EventAccountService,
        RepositoryProvider(Entity.EVENT_ACCOUNT, EventAccountRepositoryImpl),
        TransactionProvider(SqlTransaction),
    ],
    exports: [EventAccountService],
})
export class EventAccountModule {}

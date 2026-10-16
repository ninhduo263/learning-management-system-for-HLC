import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { EventController } from "./controller/event.controller";
import { EventService } from "./services/event.service";
import { EventRepositoryImpl } from "./repository/event.repository";
import { Event } from "./entities/event.entity";
import { EventAccountModule } from "../event-account/event-account.module";
import { RepositoryProvider } from "@module/repository/common/repository";
import { TransactionProvider } from "@module/repository/common/transaction";
import { SqlTransaction } from "@module/repository/sequelize/sql.transaction";
import { Entity } from "@module/repository";

@Module({
    imports: [SequelizeModule.forFeature([Event]), EventAccountModule],
    controllers: [EventController],
    providers: [
        EventService,
        RepositoryProvider(Entity.EVENT, EventRepositoryImpl),
        TransactionProvider(SqlTransaction),
    ],
    exports: [EventService],
})
export class EventModule {}

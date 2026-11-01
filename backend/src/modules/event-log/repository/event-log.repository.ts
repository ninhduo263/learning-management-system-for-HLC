import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { EventLog } from "../entities/event-log.entity";
import { Injectable } from "@nestjs/common";
import { ModelCtor } from "sequelize-typescript";
import { InjectModel } from "@nestjs/sequelize";
import { CommonQueryDto } from "@common/dto/common-query.dto";
import { EventLogRepository } from "./event-log-repository.interface";

@Injectable()
export class EventLogRepositoryImpl
    extends SqlRepository<EventLog>
    implements EventLogRepository
{
    constructor(
        @InjectModel(EventLog)
        private readonly eventLogModel: ModelCtor<EventLog>,
    ) {
        super(eventLogModel);
    }

    async findAll(
        conditions: any,
        commonQuery: CommonQueryDto<EventLog>,
    ): Promise<EventLog[]> {
        return await this.eventLogModel.findAll({
            where: conditions,
            ...commonQuery,
        });
    }

    async findByEventId(eventId: string): Promise<EventLog[]> {
        return await this.eventLogModel.findAll({
            where: {
                eventId,
            },
        });
    }

    async findByIdentityCode(identityCode: string): Promise<EventLog | null> {
        return await this.eventLogModel.findOne({
            where: {
                identityCode,
            },
        });
    }

    async findById(id: string): Promise<EventLog | null> {
        return await this.eventLogModel.findByPk(id);
    }

    async checkInUser(id: string): Promise<EventLog> {
        const eventLog = await this.eventLogModel.findByPk(id);
        if (!eventLog) {
            throw new Error("EventLog not found");
        }

        eventLog.isCheckedIn = true;
        eventLog.checkInTime = new Date().toISOString();

        await eventLog.save();
        return eventLog;
    }

    async checkOutUser(id: string): Promise<EventLog> {
        const eventLog = await this.eventLogModel.findByPk(id);
        if (!eventLog) {
            throw new Error("EventLog not found");
        }

        eventLog.isCheckedOut = true;
        eventLog.checkOutTime = new Date().toISOString();

        await eventLog.save();
        return eventLog;
    }
}

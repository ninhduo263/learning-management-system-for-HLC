import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { EventLog } from "../entities/event-log.entity";
import { CommonQueryDto } from "@common/dto/common-query.dto";

export interface EventLogRepository extends BaseRepository<EventLog> {
    findAll(
        conditions: any,
        commonQuery: CommonQueryDto<EventLog>,
    ): Promise<EventLog[]>;
    findByEventId(eventId: string): Promise<EventLog[]>;
    findByIdentityCode(identityCode: string): Promise<EventLog | null>;
    findById(id: string): Promise<EventLog | null>;
    checkInUser(id: string): Promise<EventLog>;
    checkOutUser(id: string): Promise<EventLog>;
}

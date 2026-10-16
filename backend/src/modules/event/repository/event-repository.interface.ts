import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { Event } from "../entities/event.entity";
import { CommonQueryDto } from "@common/dto/common-query.dto";
export interface EventRepository extends BaseRepository<Event> {
    findByName(name: string): Promise<Event | null>;
    findById(id: string): Promise<Event | null>;
    findAll(
        conditions: any,
        commonQuery: CommonQueryDto<Event>,
    ): Promise<Event[]>;
}

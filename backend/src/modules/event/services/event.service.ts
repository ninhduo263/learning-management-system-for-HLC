import { BaseService } from "@config/service/base.service";
import { ApiError } from "@config/exception/api-error";
import { Entity } from "@module/repository";
import { InjectRepository } from "@module/repository/common/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { Event } from "../entities/event.entity";
import { EventRepository } from "../repository/event-repository.interface";
import { CreateEventDto } from "../dto/create-event.dto";
import { UpdateEventDto } from "../dto/update-event.dto";
import { CommonQueryDto } from "@common/dto/common-query.dto";
@Injectable()
export class EventService extends BaseService<Event, EventRepository> {
    constructor(
        @InjectRepository(Entity.EVENT)
        private readonly eventRepository: EventRepository,
        @InjectTransaction()
        private readonly eventTransaction: BaseTransaction,
    ) {
        super(eventRepository, {
            notFoundCode: "error-event-not-found",
            transaction: eventTransaction,
        });
    }

    async createEvent(dto: CreateEventDto): Promise<Event> {
        const existingEvent = await this.eventRepository.findByName(
            dto.ten_su_kien,
        );
        if (existingEvent) {
            throw ApiError.BadRequest("error-event-exist");
        }

        const t = await this.eventTransaction.startTransaction();
        try {
            const res = await this.eventRepository.create(dto, {
                transaction: t,
            });
            await this.eventTransaction.commitTransaction(t);
            return res;
        } catch (err) {
            await this.eventTransaction.abortTransaction(t);
            throw err;
        }
    }

    async updateEvent(id: string, dto: UpdateEventDto): Promise<Event> {
        const existingEvent = await this.eventRepository.findById(id);
        if (!existingEvent) {
            throw ApiError.NotFound("error-event-not-found");
        }
        const updatedEvent = await this.eventRepository.updateById(id, dto);
        return updatedEvent;
    }

    async findAll(
        conditions: any,
        commonQuery: CommonQueryDto<Event>,
    ): Promise<Event[]> {
        return this.eventRepository.findAll(conditions, commonQuery);
    }

    async findByIdCustom(id: string): Promise<Event> {
        const event = await this.eventRepository.findById(id);
        if (!event) {
            throw ApiError.NotFound("error-event-not-found");
        }
        return event;
    }

    async deleteEventById(id: string): Promise<Event> {
        const existingEvent = await this.eventRepository.findById(id);
        if (!existingEvent) {
            throw ApiError.NotFound("error-event-not-found");
        }

        const t = await this.eventTransaction.startTransaction();
        try {
            const deletedEvent = await this.eventRepository.deleteById(id, {
                transaction: t,
            });
            await this.eventTransaction.commitTransaction(t);
            return deletedEvent;
        } catch (err) {
            await this.eventTransaction.abortTransaction(t);
            throw err;
        }
    }

    async getEventWithLogs(id: string): Promise<Event> {
        const event = await this.eventRepository.findById(id);
        if (!event) {
            throw ApiError.NotFound("error-event-not-found");
        }
        return event;
    }
}

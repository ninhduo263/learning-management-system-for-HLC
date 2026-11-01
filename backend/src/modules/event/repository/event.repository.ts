import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { ModelCtor } from "sequelize-typescript";
import { Event } from "../entities/event.entity";
import { EventRepository } from "./event-repository.interface";
import { CommonQueryDto } from "@common/dto/common-query.dto";
@Injectable()
export class EventRepositoryImpl
    extends SqlRepository<Event>
    implements EventRepository
{
    constructor(
        @InjectModel(Event)
        private readonly eventModel: ModelCtor<Event>,
    ) {
        super(eventModel);
    }

    async findByName(name: string): Promise<Event | null> {
        return await this.eventModel.findOne({
            where: {
                ten_su_kien: name,
            },
        });
    }
    async findById(id: string): Promise<Event | null> {
        return await this.eventModel.findByPk(id);
    }
    async findAll(
        conditions: any,
        commonQuery: CommonQueryDto<Event>,
    ): Promise<Event[]> {
        return await this.eventModel.findAll({
            where: conditions,
            ...commonQuery,
        });
    }
}

import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { ModelCtor } from "sequelize-typescript";
import { EventAccount } from "../entities/event-account.entity";
import { EventAccountRepository } from "./event-account-repository.interface";

@Injectable()
export class EventAccountRepositoryImpl
    extends SqlRepository<EventAccount>
    implements EventAccountRepository
{
    constructor(
        @InjectModel(EventAccount)
        private readonly eventAccountModel: ModelCtor<EventAccount>,
    ) {
        super(eventAccountModel);
    }

    async findByUsername(username: string): Promise<EventAccount | null> {
        return this.getOne({ username });
    }
}

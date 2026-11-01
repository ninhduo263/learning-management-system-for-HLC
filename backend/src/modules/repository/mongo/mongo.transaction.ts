import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { ClientSession } from "mongodb";
import { Connection } from "mongoose";
import { BaseTransaction } from "../common/base-transaction.interface";

@Injectable()
export class MongoTransaction implements BaseTransaction<ClientSession> {
    constructor(
        @InjectConnection()
        private readonly connection: Connection,
    ) {}

    async startTransaction(): Promise<ClientSession> {
        const transaction = await this.connection.startSession();
        transaction.startTransaction();
        return transaction;
    }

    async commitTransaction(
        transaction: ClientSession,
    ): Promise<ClientSession> {
        await transaction.commitTransaction();
        await transaction.endSession();
        return transaction;
    }

    async abortTransaction(transaction: ClientSession): Promise<ClientSession> {
        await transaction.abortTransaction();
        await transaction.endSession();
        return transaction;
    }
}

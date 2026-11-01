import { Injectable } from "@nestjs/common";
import { Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import {
    BaseTransaction,
    TransactionOption,
} from "../common/base-transaction.interface";

@Injectable()
export class SqlTransaction implements BaseTransaction<Transaction> {
    constructor(private readonly sequelize: Sequelize) {}
    async startTransaction(
        options?: TransactionOption<Transaction>,
    ): Promise<Transaction> {
        const { transaction } = options || {};
        let isolationLevel: Transaction.ISOLATION_LEVELS;
        switch (options?.isolationLevel) {
            case "READ_COMMITTED": {
                isolationLevel = Transaction.ISOLATION_LEVELS.READ_COMMITTED;
                break;
            }
            case "READ_UNCOMMITTED": {
                isolationLevel = Transaction.ISOLATION_LEVELS.READ_UNCOMMITTED;
                break;
            }
            case "REPEATABLE_READ": {
                isolationLevel = Transaction.ISOLATION_LEVELS.REPEATABLE_READ;
                break;
            }
            case "SERIALIZABLE": {
                isolationLevel = Transaction.ISOLATION_LEVELS.SERIALIZABLE;
                break;
            }
        }
        const res = await this.sequelize.transaction({
            transaction,
            autocommit: false,
            isolationLevel,
        });
        return res;
    }

    async commitTransaction(transaction: Transaction): Promise<Transaction> {
        await transaction.commit();
        return transaction;
    }

    async abortTransaction(transaction: Transaction): Promise<Transaction> {
        await transaction.rollback();
        return transaction;
    }
}

export type TransactionOption<T = unknown> = {
    isolationLevel?:
        | "READ_UNCOMMITTED"
        | "READ_COMMITTED"
        | "REPEATABLE_READ"
        | "SERIALIZABLE";
    transaction?: T;
};

export interface BaseTransaction<T = unknown> {
    startTransaction(options?: TransactionOption<T>): Promise<T>;
    commitTransaction(transaction: T): Promise<T>;
    abortTransaction(transaction: T): Promise<T>;
}

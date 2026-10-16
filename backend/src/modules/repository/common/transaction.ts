import { Inject, Provider, Type } from "@nestjs/common";

export const TRANSACTION_PROVIDER = "BaseTransaction";

export const TransactionProvider = (transactionClass: Type<any>): Provider => {
    return {
        provide: TRANSACTION_PROVIDER,
        useClass: transactionClass,
    };
};

export const InjectTransaction = () => Inject(TRANSACTION_PROVIDER);

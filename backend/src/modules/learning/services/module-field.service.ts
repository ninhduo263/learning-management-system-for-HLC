import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { ModuleField } from "../entities/module-field.entity";
import { ModuleFieldRepository } from "../repositories/module-field-repository.interface";

@Injectable()
export class ModuleFieldService extends BaseService<
    ModuleField,
    ModuleFieldRepository
> {
    constructor(
        @InjectRepository(Entity.MODULE_FIELD)
        private readonly moduleFieldRepository: ModuleFieldRepository,
        @InjectTransaction()
        private readonly moduleFieldTransaction: BaseTransaction,
    ) {
        super(moduleFieldRepository, {
            notFoundCode: "error-record-not-found",
            transaction: moduleFieldTransaction,
        });
    }
}

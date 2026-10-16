import { BaseImportService } from "@config/service/base-import.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { User } from "../entities/user.entity";
import { UserRepository } from "../repository/user-repository.interface";

@Injectable()
export class UserImportService extends BaseImportService<User, UserRepository> {
    constructor(
        @InjectRepository(Entity.USER)
        private readonly userRepository: UserRepository,
        @InjectTransaction()
        private readonly userTransaction: BaseTransaction,
    ) {
        super(userRepository, { transaction: userTransaction });
    }
}

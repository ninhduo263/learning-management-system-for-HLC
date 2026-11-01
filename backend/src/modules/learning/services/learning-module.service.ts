import { CreateQuery } from "@common/constant";
import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseQueryOption } from "@module/repository/common/base-repository.interface";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { LEARNING_MODULE_CODE_PREFIX } from "../common/constant";
import { LearningModule } from "../entities/learning-module.entity";
import { LearningModuleRepository } from "../repositories/learning-module-repository.interface";

@Injectable()
export class LearningModuleService extends BaseService<
    LearningModule,
    LearningModuleRepository
> {
    constructor(
        @InjectRepository(Entity.LEARNING_MODULE)
        private readonly learningModuleRepository: LearningModuleRepository,
        @InjectTransaction()
        private readonly learningModuleTransaction: BaseTransaction,
    ) {
        super(learningModuleRepository, {
            notFoundCode: "error-record-not-found",
            transaction: learningModuleTransaction,
        });
    }

    async create(
        user: User,
        dto: Partial<LearningModule>,
        options?: CreateQuery<LearningModule> & BaseQueryOption<unknown>,
    ) {
        return super.create(
            user,
            { ...dto, code: await this.generateCode() },
            options,
        );
    }

    /** LM-0001, LM-0002, ... (mã do người nhập như READING không bị ảnh hưởng) */
    private async generateCode(): Promise<string> {
        const latest = await this.learningModuleRepository.getLatestCode(
            LEARNING_MODULE_CODE_PREFIX,
        );
        const latestNumber =
            Number(latest?.slice(LEARNING_MODULE_CODE_PREFIX.length)) || 0;
        return `${LEARNING_MODULE_CODE_PREFIX}${String(latestNumber + 1).padStart(4, "0")}`;
    }
}

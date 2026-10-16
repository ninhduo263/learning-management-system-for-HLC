import { BaseService } from "@config/service/base.service";
import { ApiError } from "@config/exception/api-error";
import { Entity } from "@module/repository";
import { InjectRepository } from "@module/repository/common/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { hash, compare } from "bcryptjs";
import { EventAccount } from "../entities/event-account.entity";
import { EventAccountRepository } from "../repository/event-account-repository.interface";
import { CreateEventAccountDto } from "../dto/create-event-account.dto";
import { UpdateEventAccountDto } from "../dto/update-event-account.dto";

@Injectable()
export class EventAccountService extends BaseService<
    EventAccount,
    EventAccountRepository
> {
    constructor(
        @InjectRepository(Entity.EVENT_ACCOUNT)
        private readonly eventAccountRepository: EventAccountRepository,
        @InjectTransaction()
        private readonly eventAccountTransaction: BaseTransaction,
    ) {
        super(eventAccountRepository, {
            notFoundCode: "error-user-not-found",
            transaction: eventAccountTransaction,
        });
    }

    async createEventAccount(
        dto: CreateEventAccountDto,
    ): Promise<EventAccount> {
        // Kiểm tra username đã tồn tại chưa
        const existingAccount =
            await this.eventAccountRepository.findByUsername(dto.username);
        if (existingAccount) {
            throw ApiError.BadRequest("error-user-exist");
        }

        // Hash password
        const hashedPassword = await hash(dto.password, 10);

        const t = await this.eventAccountTransaction.startTransaction();
        try {
            const res = await this.eventAccountRepository.create(
                {
                    ...dto,
                    password: hashedPassword,
                },
                { transaction: t },
            );

            await this.eventAccountTransaction.commitTransaction(t);
            return res;
        } catch (err) {
            await this.eventAccountTransaction.abortTransaction(t);
            throw err;
        }
    }

    async updateEventAccount(
        id: string,
        dto: UpdateEventAccountDto,
    ): Promise<EventAccount> {
        // Nếu có password mới thì hash
        if (dto.password) {
            dto.password = await hash(dto.password, 10);
        }

        // Nếu có username mới thì kiểm tra trùng lặp
        if (dto.username) {
            const existingAccount =
                await this.eventAccountRepository.findByUsername(dto.username);
            if (existingAccount && existingAccount._id !== id) {
                throw ApiError.BadRequest("error-user-exist");
            }
        }

        const t = await this.eventAccountTransaction.startTransaction();
        try {
            const res = await this.eventAccountRepository.updateById(id, dto, {
                transaction: t,
            });
            await this.eventAccountTransaction.commitTransaction(t);
            return res;
        } catch (err) {
            await this.eventAccountTransaction.abortTransaction(t);
            throw err;
        }
    }

    async validatePassword(
        username: string,
        password: string,
    ): Promise<EventAccount> {
        const account =
            await this.eventAccountRepository.findByUsername(username);
        if (!account) {
            throw ApiError.Unauthorized("error-unauthorized");
        }

        const isValid = await compare(password, account.password);
        if (!isValid) {
            throw ApiError.Unauthorized("error-unauthorized");
        }

        return account;
    }

    async findByUsername(username: string): Promise<EventAccount | null> {
        return this.eventAccountRepository.findByUsername(username);
    }
}

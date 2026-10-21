import {
    DeleteByIdQuery,
    GetByIdQuery,
    GetManyQuery,
    GetOneQuery,
    GetPageQuery,
    UpdateByIdQuery,
    createUserPassword,
} from "@common/constant";
import { RequestAuthData } from "@common/constant/class/request-auth-data";
import { Configuration } from "@config/configuration";
import { ApiError } from "@config/exception/api-error";
import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import {
    BaseQueryOption,
    QueryCondition,
    UpdateDocument,
} from "@module/repository/common/base-repository.interface";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { SettingKey } from "@module/setting/common/constant";
import { SettingService } from "@module/setting/setting.service";
import { CreateUserDto } from "@module/user/dto/create-user.dto";
import { UserRepository } from "@module/user/repository/user-repository.interface";
import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import bcrypt from "bcryptjs";
import { SystemRole } from "../common/constant";
import { ChangePasswordDto } from "../dto/change-password.dto";
import { User } from "../entities/user.entity";

@Injectable()
export class UserService
    extends BaseService<User, UserRepository>
    implements OnApplicationBootstrap
{
    constructor(
        @InjectRepository(Entity.USER)
        private readonly userRepository: UserRepository,
        private readonly settingService: SettingService,
        private readonly configService: ConfigService<Configuration>,
        @InjectTransaction()
        private readonly userTransaction: BaseTransaction,
    ) {
        super(userRepository, {
            notFoundCode: "error-user-not-found",
            transaction: userTransaction,
        });
    }

    async testUser() {
        await this.userRepository.distinct("", { asd: 1 });
        const user = await this.userRepository.updateOne(
            {
                username: "admin",
            },
            {
                $inc: { __v: -1 },
                fullname: 1,
            },
        );
        return user;
    }

    async onApplicationBootstrap() {
        const setting = await this.settingService.getSettingValue(
            SettingKey.INIT_DATA,
        );
        const update = setting || {};
        if (!update.isAdminCreated) {
            update.isAdminCreated = true;
            const { defaultAdminUsername, defaultAdminPassword } =
                this.configService.get("server", {
                    infer: true,
                });
            await this.userRepository.create({
                username: defaultAdminUsername,
                email: "admin@administrator.com",
                password: await createUserPassword(defaultAdminPassword),
                systemRole: SystemRole.ADMIN,
                fullname: "Administrator",
            });
            Logger.verbose("Admin created");
            await this.settingService.setSettingValue(
                SettingKey.INIT_DATA,
                update,
            );
        }
    }

    async internalGetById(id: string) {
        return this.userRepository.getById(id, { enableDataPartition: false });
    }

    async getMe(authData: RequestAuthData) {
        const user = await authData.getUser();
        return this.omitPassword(user);
    }

    /** Không bao giờ trả mã băm mật khẩu ra API */
    private omitPassword<T extends Partial<User>>(user: T): T {
        if (!user) return user;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...rest } = user;
        return rest as T;
    }

    async getById(
        user: User,
        id: string,
        query?: GetByIdQuery<User> & BaseQueryOption<unknown>,
    ) {
        return this.omitPassword(await super.getById(user, id, query));
    }

    async getOne(
        user: User,
        conditions: QueryCondition<User>,
        query?: GetOneQuery<User> & BaseQueryOption<unknown>,
    ) {
        return this.omitPassword(await super.getOne(user, conditions, query));
    }

    async getMany(
        user: User,
        conditions: QueryCondition<User>,
        query?: GetManyQuery<User> & BaseQueryOption<unknown>,
    ) {
        const list = await super.getMany(user, conditions, query);
        return list.map((item) => this.omitPassword(item));
    }

    async getPage(
        user: User,
        conditions: QueryCondition<User>,
        query?: GetPageQuery<User> & BaseQueryOption<unknown>,
    ) {
        const page = await super.getPage(user, conditions, query);
        page.result = page.result.map((item) => this.omitPassword(item));
        return page;
    }

    async updateById(
        user: User,
        id: string,
        update: UpdateDocument<User>,
        query?: UpdateByIdQuery & BaseQueryOption<unknown>,
    ) {
        const doc = update as Partial<User>;
        if (doc.password) {
            doc.password = await createUserPassword(doc.password);
        }
        return this.omitPassword(await super.updateById(user, id, doc, query));
    }

    async deleteById(
        user: User,
        id: string,
        query?: DeleteByIdQuery<User> & BaseQueryOption<unknown>,
    ) {
        return this.omitPassword(await super.deleteById(user, id, query));
    }

    async create(user: User, dto: CreateUserDto): Promise<User> {
        if (dto.password) {
            dto.password = await createUserPassword(dto.password);
        }
        const t = await this.userTransaction.startTransaction();
        try {
            const res = await this.userRepository.create(dto, {
                transaction: t,
            });
            await this.userTransaction.commitTransaction(t);
            return this.omitPassword(res);
        } catch (err) {
            await this.userTransaction.abortTransaction(t);
            throw err;
        }
    }

    async changePasswordMe(user: User, dto: ChangePasswordDto) {
        const correctOldPassword = await this.comparePassword(
            user,
            dto.oldPass,
        );
        if (!correctOldPassword) {
            throw ApiError.BadRequest("error-old-password-wrong");
        }
        if (dto.newPass === dto.oldPass) {
            throw ApiError.BadRequest("error-duplicate-new-password");
        }
        const res = await this.userRepository.updateById(user._id, {
            password: await createUserPassword(dto.newPass),
        });
        return this.omitPassword(res);
    }

    async comparePassword(user: User, password: string) {
        return bcrypt.compare(password, user.password);
    }
}

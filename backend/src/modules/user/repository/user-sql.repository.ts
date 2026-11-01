import { UserModel } from "@module/repository/sequelize/model/user.model";
import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { ModelCtor } from "sequelize-typescript";
import { User } from "../entities/user.entity";
import { UserRepository } from "./user-repository.interface";

export class UserSqlRepository
    extends SqlRepository<User>
    implements UserRepository
{
    constructor(
        @InjectModel(UserModel)
        private readonly userModel: ModelCtor<UserModel>,
    ) {
        super(userModel, { dataPartition: { mapping: "dataPartitionCode" } });
    }
    async getMe(user: User): Promise<User> {
        const res = await this.userModel.findOne({
            where: { username: user.username },
        });
        return res;
    }
}

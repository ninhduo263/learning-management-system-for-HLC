import { OneSignalUserModel } from "@module/repository/sequelize/model/one-signal-user.model";
import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { ModelCtor } from "sequelize-typescript";
import { OneSignalUser } from "../entities/one-signal-user.entity";
import { OneSignalUserRepository } from "./one-signal-user-repository.interface";

export class OneSignalUserSqlRepository
    extends SqlRepository<OneSignalUser>
    implements OneSignalUserRepository
{
    constructor(
        @InjectModel(OneSignalUserModel)
        private readonly oneSignalUserModel: ModelCtor<OneSignalUserModel>,
    ) {
        super(oneSignalUserModel);
    }
}

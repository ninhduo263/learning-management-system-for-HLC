import { AuthModel } from "@module/repository/sequelize/model/auth.model";
import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { ModelCtor } from "sequelize-typescript";
import { Auth } from "../entities/auth.entity";
import { AuthRepository } from "./auth-repository.interface";

export class AuthSqlRepository
    extends SqlRepository<Auth>
    implements AuthRepository
{
    constructor(
        @InjectModel(AuthModel)
        private readonly authModel: ModelCtor<AuthModel>,
    ) {
        super(authModel, {
            populate: {
                getById: [{ path: "userInfo" }],
            },
        });
    }
}

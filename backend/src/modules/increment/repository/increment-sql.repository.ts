import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { IncrementRepository } from "./increment-repository.interface";
import { Increment } from "../entities/increment.entity";
import { InjectModel } from "@nestjs/sequelize";
import { IncrementModel } from "@module/repository/sequelize/model/increment.model";
import { ModelCtor } from "sequelize-typescript";
import { IncrementName } from "../common/constant";

export class IncrementSqlRepository
    extends SqlRepository<Increment>
    implements IncrementRepository
{
    constructor(
        @InjectModel(IncrementModel)
        private readonly incrementModel: ModelCtor<IncrementModel>,
    ) {
        super(incrementModel);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    increase(name: IncrementName): Promise<Increment> {
        throw new Error("Method not implemented");
    }
}

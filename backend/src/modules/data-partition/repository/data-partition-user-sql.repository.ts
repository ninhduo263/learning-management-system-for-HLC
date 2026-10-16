import { PopulationDto } from "@common/dto/population.dto";
import { DataPartitionUserModel } from "@module/repository/sequelize/model/data-partition-user.model";
import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { DataPartitionUser } from "../entities/data-partition-user.entity";
import { DataPartitionUserRepository } from "./data-partition-user-repository.interface";

const commonPopulate: PopulationDto<DataPartitionUser>[] = [
    { path: "dataPartition" },
];

export class DataPartitionUserSqlRepository
    extends SqlRepository<DataPartitionUser>
    implements DataPartitionUserRepository
{
    constructor(
        @InjectModel(DataPartitionUserModel)
        private readonly dataPartitionUserModel: typeof DataPartitionUserModel,
    ) {
        super(dataPartitionUserModel, {
            populate: {
                getBatch: commonPopulate,
                getById: commonPopulate,
                getExport: commonPopulate,
                getMany: commonPopulate,
                getOne: commonPopulate,
                getPage: commonPopulate,
            },
        });
    }
}

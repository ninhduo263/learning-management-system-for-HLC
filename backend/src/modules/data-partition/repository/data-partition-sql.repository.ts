import { DataPartitionModel } from "@module/repository/sequelize/model/data-partition.model";
import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { DataPartition } from "../entities/data-partition.entity";
import { DataPartitionRepository } from "./data-partition-repository.interface";

export class DataPartitionSqlRepository
    extends SqlRepository<DataPartition>
    implements DataPartitionRepository
{
    constructor(
        @InjectModel(DataPartitionModel)
        private readonly dataPartitionModel: typeof DataPartitionModel,
    ) {
        super(dataPartitionModel);
    }
}

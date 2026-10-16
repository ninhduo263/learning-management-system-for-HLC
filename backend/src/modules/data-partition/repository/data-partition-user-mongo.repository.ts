import { PopulationDto } from "@common/dto/population.dto";
import { Entity } from "@module/repository";
import { MongoRepository } from "@module/repository/mongo/mongo.repository";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { DataPartitionUser } from "../entities/data-partition-user.entity";
import { DataPartitionUserRepository } from "./data-partition-user-repository.interface";

const commonPopulate: PopulationDto<DataPartitionUser>[] = [
    { path: "dataPartition" },
];

export class DataPartitionUserMongoRepository
    extends MongoRepository<DataPartitionUser>
    implements DataPartitionUserRepository
{
    constructor(
        @InjectModel(Entity.DATA_PARTITION_USER)
        private readonly dataPartitionUserModel: Model<DataPartitionUser>,
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

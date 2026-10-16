import { Entity } from "@module/repository";
import { MongoRepository } from "@module/repository/mongo/mongo.repository";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { DataPartition } from "../entities/data-partition.entity";
import { DataPartitionRepository } from "./data-partition-repository.interface";

export class DataPartitionMongoRepository
    extends MongoRepository<DataPartition>
    implements DataPartitionRepository
{
    constructor(
        @InjectModel(Entity.DATA_PARTITION)
        private readonly dataPartitionModel: Model<DataPartition>,
    ) {
        super(dataPartitionModel);
    }
}

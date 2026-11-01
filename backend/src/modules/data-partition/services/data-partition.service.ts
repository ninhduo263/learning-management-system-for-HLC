import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { InjectRepository } from "@module/repository/common/repository";
import { Injectable } from "@nestjs/common";
import { DataPartition } from "../entities/data-partition.entity";
import { DataPartitionRepository } from "../repository/data-partition-repository.interface";

@Injectable()
export class DataPartitionService extends BaseService<
    DataPartition,
    DataPartitionRepository
> {
    constructor(
        @InjectRepository(Entity.DATA_PARTITION)
        private readonly dataPartitionRepository: DataPartitionRepository,
    ) {
        super(dataPartitionRepository);
    }
}

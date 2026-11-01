import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { DataPartition } from "../entities/data-partition.entity";

export interface DataPartitionRepository
    extends BaseRepository<DataPartition> {}

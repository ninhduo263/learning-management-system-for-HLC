import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { DataPartitionUser } from "../entities/data-partition-user.entity";

export interface DataPartitionUserRepository
    extends BaseRepository<DataPartitionUser> {}

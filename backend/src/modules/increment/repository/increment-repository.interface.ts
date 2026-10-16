import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { IncrementName } from "../common/constant";
import { Increment } from "../entities/increment.entity";

export interface IncrementRepository extends BaseRepository<Increment> {
    increase(name: IncrementName): Promise<Increment>;
}

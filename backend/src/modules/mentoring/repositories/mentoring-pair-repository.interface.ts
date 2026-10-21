import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { MentoringPair } from "../entities/mentoring-pair.entity";

export interface MentoringPairRepository
    extends BaseRepository<MentoringPair> {}

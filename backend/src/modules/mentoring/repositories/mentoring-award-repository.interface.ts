import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { MentoringAward } from "../entities/mentoring-award.entity";

export interface MentoringAwardRepository
    extends BaseRepository<MentoringAward> {}

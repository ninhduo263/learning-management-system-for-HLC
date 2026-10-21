import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { SubmissionScore } from "../entities/submission-score.entity";

export interface SubmissionScoreRepository
    extends BaseRepository<SubmissionScore> {}

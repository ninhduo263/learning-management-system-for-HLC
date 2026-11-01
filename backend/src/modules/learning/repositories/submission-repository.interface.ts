import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { Submission } from "../entities/submission.entity";

export interface SubmissionRepository extends BaseRepository<Submission> {}

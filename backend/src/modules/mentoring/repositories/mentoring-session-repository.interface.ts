import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { MentoringSession } from "../entities/mentoring-session.entity";

export interface MentoringSessionRepository
    extends BaseRepository<MentoringSession> {}

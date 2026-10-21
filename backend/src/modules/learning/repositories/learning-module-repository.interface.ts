import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { LearningModule } from "../entities/learning-module.entity";

export interface LearningModuleRepository
    extends BaseRepository<LearningModule> {
    /** Mã lớn nhất đang có theo tiền tố (vd "LM-0007"), null nếu chưa có */
    getLatestCode(prefix: string): Promise<string | null>;
}

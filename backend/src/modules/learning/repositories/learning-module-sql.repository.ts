import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { Op } from "sequelize";
import { LearningModule } from "../entities/learning-module.entity";
import { LearningModuleModel } from "../models/learning-module.model";
import { LearningModuleRepository } from "./learning-module-repository.interface";

export class LearningModuleSqlRepository
    extends SqlRepository<LearningModule>
    implements LearningModuleRepository
{
    constructor(
        @InjectModel(LearningModuleModel)
        private readonly learningModuleModel: typeof LearningModuleModel,
    ) {
        super(learningModuleModel);
    }

    async getLatestCode(prefix: string): Promise<string | null> {
        const latest = await this.learningModuleModel.findOne({
            attributes: ["code"],
            where: { code: { [Op.like]: `${prefix}%` } },
            order: [["code", "DESC"]],
        });
        return latest?.code ?? null;
    }
}

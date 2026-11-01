import { PartialType } from "@nestjs/swagger";
import { LearningModule } from "../entities/learning-module.entity";

export class LearningModuleConditionDto extends PartialType(LearningModule) {}

import { PartialType } from "@nestjs/swagger";
import { CreateLearningModuleDto } from "./create-learning-module.dto";

export class UpdateLearningModuleDto extends PartialType(
    CreateLearningModuleDto,
) {}

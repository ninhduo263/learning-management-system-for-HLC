import { OmitType } from "@nestjs/swagger";
import { LearningModule } from "../entities/learning-module.entity";

/** Mã module do hệ thống tự sinh nên không nhận từ client */
export class CreateLearningModuleDto extends OmitType(LearningModule, [
    "_id",
    "code",
]) {}

import { PartialType } from "@nestjs/swagger";
import { SubmissionScore } from "../entities/submission-score.entity";

export class SubmissionScoreConditionDto extends PartialType(SubmissionScore) {}

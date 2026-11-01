import { OmitType } from "@nestjs/swagger";
import { SubmissionScore } from "../entities/submission-score.entity";

export class CreateSubmissionScoreDto extends OmitType(SubmissionScore, [
    "_id",
]) {}

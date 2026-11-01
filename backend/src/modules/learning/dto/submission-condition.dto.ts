import { PartialType } from "@nestjs/swagger";
import { Submission } from "../entities/submission.entity";

export class SubmissionConditionDto extends PartialType(Submission) {}

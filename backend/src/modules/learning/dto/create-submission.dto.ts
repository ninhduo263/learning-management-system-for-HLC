import { OmitType } from "@nestjs/swagger";
import { Submission } from "../entities/submission.entity";

export class CreateSubmissionDto extends OmitType(Submission, ["_id"]) {}

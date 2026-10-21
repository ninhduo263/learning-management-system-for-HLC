import { PartialType } from "@nestjs/swagger";
import { CreateSubmissionScoreDto } from "./create-submission-score.dto";

export class UpdateSubmissionScoreDto extends PartialType(
    CreateSubmissionScoreDto,
) {}

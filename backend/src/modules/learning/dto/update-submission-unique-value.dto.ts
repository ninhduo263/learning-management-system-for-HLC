import { PartialType } from "@nestjs/swagger";
import { CreateSubmissionUniqueValueDto } from "./create-submission-unique-value.dto";

export class UpdateSubmissionUniqueValueDto extends PartialType(
    CreateSubmissionUniqueValueDto,
) {}

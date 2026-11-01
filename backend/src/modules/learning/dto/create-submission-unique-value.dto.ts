import { OmitType } from "@nestjs/swagger";
import { SubmissionUniqueValue } from "../entities/submission-unique-value.entity";

export class CreateSubmissionUniqueValueDto extends OmitType(
    SubmissionUniqueValue,
    ["_id"],
) {}

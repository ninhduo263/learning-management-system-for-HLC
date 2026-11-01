import { PartialType } from "@nestjs/swagger";
import { SubmissionUniqueValue } from "../entities/submission-unique-value.entity";

export class SubmissionUniqueValueConditionDto extends PartialType(
    SubmissionUniqueValue,
) {}

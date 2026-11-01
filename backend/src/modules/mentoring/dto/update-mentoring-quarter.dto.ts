import { PartialType } from "@nestjs/swagger";
import { CreateMentoringQuarterDto } from "./create-mentoring-quarter.dto";

export class UpdateMentoringQuarterDto extends PartialType(
    CreateMentoringQuarterDto,
) {}

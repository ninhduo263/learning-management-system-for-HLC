import { PartialType } from "@nestjs/swagger";
import { CreateMentoringAwardDto } from "./create-mentoring-award.dto";

export class UpdateMentoringAwardDto extends PartialType(
    CreateMentoringAwardDto,
) {}

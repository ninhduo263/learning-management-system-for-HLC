import { PartialType } from "@nestjs/swagger";
import { CreateMentoringPairDto } from "./create-mentoring-pair.dto";

export class UpdateMentoringPairDto extends PartialType(
    CreateMentoringPairDto,
) {}

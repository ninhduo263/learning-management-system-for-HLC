import { PartialType } from "@nestjs/swagger";
import { CreateMentoringRecapDto } from "./create-mentoring-recap.dto";

export class UpdateMentoringRecapDto extends PartialType(
    CreateMentoringRecapDto,
) {}

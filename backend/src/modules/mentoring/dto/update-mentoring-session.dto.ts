import { PartialType } from "@nestjs/swagger";
import { CreateMentoringSessionDto } from "./create-mentoring-session.dto";

export class UpdateMentoringSessionDto extends PartialType(
    CreateMentoringSessionDto,
) {}

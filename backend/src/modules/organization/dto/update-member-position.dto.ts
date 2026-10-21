import { PartialType } from "@nestjs/swagger";
import { CreateMemberPositionDto } from "./create-member-position.dto";

export class UpdateMemberPositionDto extends PartialType(
    CreateMemberPositionDto,
) {}

import { OmitType } from "@nestjs/swagger";
import { MemberPosition } from "../entities/member-position.entity";

export class CreateMemberPositionDto extends OmitType(MemberPosition, [
    "_id",
]) {}

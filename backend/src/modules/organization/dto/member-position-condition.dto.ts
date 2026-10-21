import { PartialType } from "@nestjs/swagger";
import { MemberPosition } from "../entities/member-position.entity";

export class MemberPositionConditionDto extends PartialType(MemberPosition) {}

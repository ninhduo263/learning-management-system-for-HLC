import { PartialType } from "@nestjs/swagger";
import { Member } from "../entities/member.entity";

export class MemberConditionDto extends PartialType(Member) {}

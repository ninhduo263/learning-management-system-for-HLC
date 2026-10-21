import { OmitType } from "@nestjs/swagger";
import { Member } from "../entities/member.entity";

export class CreateMemberDto extends OmitType(Member, ["_id"]) {}

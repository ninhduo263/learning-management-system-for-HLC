import { OmitType } from "@nestjs/swagger";
import { PointRule } from "../entities/point-rule.entity";

export class CreatePointRuleDto extends OmitType(PointRule, ["_id"]) {}

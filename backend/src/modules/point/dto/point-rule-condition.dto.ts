import { PartialType } from "@nestjs/swagger";
import { PointRule } from "../entities/point-rule.entity";

export class PointRuleConditionDto extends PartialType(PointRule) {}

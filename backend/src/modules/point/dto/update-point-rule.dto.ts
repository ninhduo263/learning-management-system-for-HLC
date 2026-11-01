import { PartialType } from "@nestjs/swagger";
import { CreatePointRuleDto } from "./create-point-rule.dto";

export class UpdatePointRuleDto extends PartialType(CreatePointRuleDto) {}

import { PartialType } from "@nestjs/swagger";
import { ModuleCriterion } from "../entities/module-criterion.entity";

export class ModuleCriterionConditionDto extends PartialType(ModuleCriterion) {}

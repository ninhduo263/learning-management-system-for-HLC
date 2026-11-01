import { OmitType } from "@nestjs/swagger";
import { ModuleCriterion } from "../entities/module-criterion.entity";

export class CreateModuleCriterionDto extends OmitType(ModuleCriterion, [
    "_id",
]) {}

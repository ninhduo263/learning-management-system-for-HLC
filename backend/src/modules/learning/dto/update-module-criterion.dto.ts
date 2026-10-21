import { PartialType } from "@nestjs/swagger";
import { CreateModuleCriterionDto } from "./create-module-criterion.dto";

export class UpdateModuleCriterionDto extends PartialType(
    CreateModuleCriterionDto,
) {}

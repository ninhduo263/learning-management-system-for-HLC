import { PartialType } from "@nestjs/swagger";
import { Department } from "../entities/department.entity";

export class DepartmentConditionDto extends PartialType(Department) {}

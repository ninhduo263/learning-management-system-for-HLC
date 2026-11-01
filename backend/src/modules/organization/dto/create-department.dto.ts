import { OmitType } from "@nestjs/swagger";
import { Department } from "../entities/department.entity";

export class CreateDepartmentDto extends OmitType(Department, ["_id"]) {}

import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { Department } from "../entities/department.entity";

export interface DepartmentRepository extends BaseRepository<Department> {}

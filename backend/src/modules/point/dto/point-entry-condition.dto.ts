import { PartialType } from "@nestjs/swagger";
import { PointEntry } from "../entities/point-entry.entity";

export class PointEntryConditionDto extends PartialType(PointEntry) {}

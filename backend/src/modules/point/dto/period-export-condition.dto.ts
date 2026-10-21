import { PartialType } from "@nestjs/swagger";
import { PeriodExport } from "../entities/period-export.entity";

export class PeriodExportConditionDto extends PartialType(PeriodExport) {}

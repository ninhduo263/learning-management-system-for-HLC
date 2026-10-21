import { OmitType } from "@nestjs/swagger";
import { PeriodExport } from "../entities/period-export.entity";

export class CreatePeriodExportDto extends OmitType(PeriodExport, ["_id"]) {}

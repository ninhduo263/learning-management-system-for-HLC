import { PartialType } from "@nestjs/swagger";
import { CreatePeriodExportDto } from "./create-period-export.dto";

export class UpdatePeriodExportDto extends PartialType(CreatePeriodExportDto) {}

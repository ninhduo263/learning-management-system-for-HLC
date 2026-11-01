import { PartialType } from "@nestjs/swagger";
import { CreatePointEntryDto } from "./create-point-entry.dto";

export class UpdatePointEntryDto extends PartialType(CreatePointEntryDto) {}

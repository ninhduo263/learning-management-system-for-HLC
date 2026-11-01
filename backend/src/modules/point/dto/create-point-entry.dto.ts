import { OmitType } from "@nestjs/swagger";
import { PointEntry } from "../entities/point-entry.entity";

export class CreatePointEntryDto extends OmitType(PointEntry, ["_id"]) {}

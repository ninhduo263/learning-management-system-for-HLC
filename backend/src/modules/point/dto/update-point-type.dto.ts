import { PartialType } from "@nestjs/swagger";
import { CreatePointTypeDto } from "./create-point-type.dto";

export class UpdatePointTypeDto extends PartialType(CreatePointTypeDto) {}

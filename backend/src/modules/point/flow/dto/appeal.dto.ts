import { OmitType } from "@nestjs/swagger";
import { AdjustmentDto } from "./adjustment.dto";

export class AppealDto extends OmitType(AdjustmentDto, ["memberId"]) {}

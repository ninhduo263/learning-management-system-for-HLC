import { PickType } from "@nestjs/swagger";
import { Setting } from "../entities/setting.entity";

export class SetSettingValue extends PickType(Setting, ["key", "value"]) {}

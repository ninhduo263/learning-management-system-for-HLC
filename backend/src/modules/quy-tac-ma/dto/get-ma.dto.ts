import { PickType } from "@nestjs/swagger";
import { IsObject } from "class-validator";
import { QuyTacMa } from "../entities/quy-tac-ma.entity";

export class GetMaDto extends PickType(QuyTacMa, ["nguon"]) {
    @IsObject()
    data: any;
}

import { ApiProperty, PickType } from "@nestjs/swagger";
import { Allow } from "class-validator";
import { File } from "../entities/file.entity";

export class CreateFileDto extends PickType(File, ["scope"]) {
    @ApiProperty({ type: "string", format: "binary" })
    @Allow()
    file: string;
}

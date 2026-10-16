import { PickType } from "@nestjs/swagger";
import { IsNumber, IsString } from "class-validator";
import { File } from "../entities/file.entity";

export class ClientInitMultipartUploadDto extends PickType(File, ["scope"]) {
    @IsString()
    filename: string;

    @IsNumber()
    size: number;

    @IsString()
    mimetype: string;

    @IsString()
    ext: string;
}

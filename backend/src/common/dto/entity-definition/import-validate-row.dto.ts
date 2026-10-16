import { IsNumber, IsObject, IsString } from "class-validator";

export class ImportValidateRowDto {
    @IsObject()
    row: unknown;

    @IsNumber()
    index: number;

    insertResult?: unknown;

    @IsString({ each: true })
    rowErrors: string[];
}

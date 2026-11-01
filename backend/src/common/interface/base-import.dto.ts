import { IsEnum, IsObject, IsOptional, IsString } from "class-validator";

export enum ImportMode {
    CREATE = "CREATE",
    UPDATE = "UPDATE",
    UPSERT = "UPSERT",
}
export class BaseImportDto {
    @IsObject({ each: true })
    rows: any[];

    @IsEnum(ImportMode)
    @IsOptional()
    mode?: ImportMode;

    // TODO: Custom update keys
    @IsString({ each: true })
    @IsOptional()
    keys?: string[];
}

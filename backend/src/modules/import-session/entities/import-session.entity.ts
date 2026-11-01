import { Entity } from "@module/repository";
import { Schema, SchemaFactory } from "@nestjs/mongoose";
import { IsOptional, IsString } from "class-validator";
import { HydratedDocument } from "mongoose";

@Schema({ collection: Entity.IMPORT_SESSION })
export class ImportSession {
    @IsString()
    entity: string;

    @IsString()
    @IsOptional()
    name?: string;
}

export const ImportSessionSchema = SchemaFactory.createForClass(ImportSession);
export type ImportSessionDocument = HydratedDocument<ImportSession>;

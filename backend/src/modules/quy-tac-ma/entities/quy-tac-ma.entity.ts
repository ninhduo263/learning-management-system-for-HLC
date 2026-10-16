import { StrObjectId } from "@common/constant";
import { BaseEntity } from "@common/interface/base-entity.interface";
import { Entity } from "@module/repository";
import { Prop, Schema, SchemaFactory, raw } from "@nestjs/mongoose";
import { Type } from "class-transformer";
import { IsString, ValidateNested } from "class-validator";
import { HydratedDocument } from "mongoose";
import { CauHinhMa, CauHinhMaSchema } from "./cau-hinh-ma.entity";

@Schema({ collection: Entity.QUY_TAC_MA })
export class QuyTacMa implements BaseEntity {
    @StrObjectId()
    _id: string;

    @IsString()
    @Prop({ unique: true })
    ten: string;

    @IsString()
    @Prop({ unique: true })
    nguon: string;

    @ValidateNested({ each: true })
    @Type(() => CauHinhMa)
    @Prop(raw(CauHinhMaSchema))
    cauHinh: CauHinhMa[];
}

export const QuyTacMaSchema = SchemaFactory.createForClass(QuyTacMa);
export type QuyTacMaDocument = HydratedDocument<QuyTacMa>;

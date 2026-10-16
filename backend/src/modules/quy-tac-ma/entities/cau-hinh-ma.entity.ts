import { Entity } from "@module/repository";
import { IsEnum, IsIn, IsOptional, IsString } from "class-validator";
import { LoaiCauHinhMa } from "../common/constant";
import { Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ _id: false })
export class CauHinhMa {
    @IsEnum(LoaiCauHinhMa)
    loai: LoaiCauHinhMa;

    @IsString()
    @IsOptional()
    thuocTinh?: string;

    @IsIn(Object.values(Entity))
    @IsOptional()
    nguonLienKet?: string;

    @IsString()
    @IsOptional()
    khoaNgoaiLienKet?: string;

    @IsString()
    @IsOptional()
    khoaChinhLienKet?: string;

    @IsString()
    @IsOptional()
    thuocTinhLienKet?: string;

    @IsString()
    @IsOptional()
    hamSinh?: string;
}

export const CauHinhMaSchema = SchemaFactory.createForClass(CauHinhMa);

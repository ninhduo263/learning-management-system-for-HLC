import { FileStorageType } from "@module/file/common/constant";
import { IsEnum, IsNumber, IsOptional } from "class-validator";

export class SettingFileStorage {
    @IsEnum(FileStorageType)
    type: FileStorageType;

    @IsNumber()
    @IsOptional()
    maxSize?: number;
}

import { IsOptional, IsString } from "class-validator";

export class SettingConditionDto {
    @IsString()
    @IsOptional()
    key?: string;

    @IsOptional()
    value?: unknown;
}

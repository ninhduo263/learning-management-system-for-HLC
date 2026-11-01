import { IsBoolean, IsOptional } from "class-validator";

export class SettingInitData {
    @IsBoolean()
    @IsOptional()
    isAdminCreated?: boolean;
}

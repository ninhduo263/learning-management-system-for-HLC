import { IsString } from "class-validator";

export class SettingServer {
    @IsString()
    dateOnlyExportFormat: string;
}

import { ClientCommonQuery } from "@common/constant/class/client-common-query";
import { IsOptional, IsString } from "class-validator";

export class EventAccountQueryDto extends ClientCommonQuery {
    @IsString()
    @IsOptional()
    username?: string;

    @IsString()
    @IsOptional()
    device_id?: string;
}

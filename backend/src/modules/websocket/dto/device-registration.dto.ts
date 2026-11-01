import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class DeviceRegistrationDto {
    @ApiProperty({ description: "ID thiết bị" })
    @IsString()
    device_id: string;

    @ApiProperty({ description: "ID kiosk" })
    @IsString()
    kiosk_id: string;
}

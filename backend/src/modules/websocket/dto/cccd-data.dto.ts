import { IsString, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CCCDDataDto {
    @ApiProperty({ description: "ID thiết bị" })
    @IsString()
    device_id: string;

    @ApiProperty({ description: "Số CCCD" })
    @IsString()
    identity_code: string;

    @ApiProperty({ description: "Họ tên" })
    @IsString()
    name: string;

    @ApiProperty({ description: "Ngày sinh", required: false })
    @IsString()
    @IsOptional()
    dob?: string;

    @ApiProperty({ description: "Giới tính", required: false })
    @IsString()
    @IsOptional()
    gender?: string;
}

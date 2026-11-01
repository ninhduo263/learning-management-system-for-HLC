import { IsString, IsOptional, MinLength } from "class-validator";

export class CreateEventAccountDto {
    @IsString()
    @MinLength(3)
    username: string;

    @IsString()
    @MinLength(6)
    password: string;

    @IsString()
    @IsOptional()
    device_id?: string;
}

import { IsOptional } from "class-validator";

export class AuthConditionDto {
    @IsOptional()
    user?: any;

    @IsOptional()
    origin?: any;

    @IsOptional()
    ip?: any;

    @IsOptional()
    platform?: any;

    @IsOptional()
    jti?: any;

    @IsOptional()
    exp?: any;
}

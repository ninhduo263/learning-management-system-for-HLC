import { IsOptional, IsString } from "class-validator";

export class ClientCommonCondition {
    @IsString()
    @IsOptional()
    _id?: string;
}

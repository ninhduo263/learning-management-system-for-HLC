import { IsNumberString, IsOptional, IsString } from "class-validator";

export class ClientCommonQuery {
    @IsOptional()
    @IsString()
    select?: string;

    @IsOptional()
    @IsString()
    sort?: string;

    @IsOptional()
    @IsNumberString()
    page?: string;

    @IsOptional()
    @IsNumberString()
    limit?: string;

    @IsOptional()
    @IsNumberString()
    skip?: string;

    @IsOptional()
    @IsString({ each: true })
    filters?: string[];

    @IsOptional()
    @IsString({ each: true })
    population?: string[];
}

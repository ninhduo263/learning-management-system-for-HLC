import { IsOptional, IsString } from "class-validator";

export class ReplaceDomainUrlDto {
    @IsString()
    oldDomain: string;

    @IsString()
    newDomain: string;

    @IsString({ each: true })
    @IsOptional()
    skipTables?: string[];
}

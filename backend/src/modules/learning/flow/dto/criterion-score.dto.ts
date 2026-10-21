import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CriterionScoreDto {
    @IsString()
    criterionId: string;

    @IsNumber()
    @Min(0)
    score: number;

    @IsString()
    @IsOptional()
    comment?: string;
}

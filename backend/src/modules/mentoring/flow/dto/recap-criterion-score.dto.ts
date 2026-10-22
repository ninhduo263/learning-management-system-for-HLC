import { IsNumber, IsString, Min } from "class-validator";

export class RecapCriterionScoreDto {
    @IsString()
    criterionId: string;

    @IsNumber()
    @Min(0)
    score: number;
}

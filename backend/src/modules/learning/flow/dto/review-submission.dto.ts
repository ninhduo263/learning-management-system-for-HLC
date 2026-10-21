import { Type } from "class-transformer";
import {
    IsArray,
    IsIn,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from "class-validator";
import { CriterionScoreDto } from "./criterion-score.dto";

export class ReviewSubmissionDto {
    @IsIn(["APPROVED", "REJECTED"])
    status: "APPROVED" | "REJECTED";

    @IsString()
    @IsOptional()
    feedback?: string;

    /** Module có tiêu chí: chấm từng tiêu chí, tổng = tổng điểm tiêu chí quy về thang maxScore */
    @ValidateNested({ each: true })
    @Type(() => CriterionScoreDto)
    @IsArray()
    @IsOptional()
    scores?: CriterionScoreDto[];

    /** Module không có tiêu chí: nhập thẳng điểm (0..maxScore) */
    @IsNumber()
    @Min(0)
    @IsOptional()
    totalScore?: number;
}

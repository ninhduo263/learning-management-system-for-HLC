import { Type } from "class-transformer";
import {
    IsArray,
    IsIn,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";
import { RecapCriterionScoreDto } from "./recap-criterion-score.dto";

export class ScoreRecapDto {
    /** APPROVED = chấp nhận và chấm điểm; REJECTED = trả recap (bắt buộc nhận xét) */
    @IsIn(["APPROVED", "REJECTED"])
    status: "APPROVED" | "REJECTED";

    @ValidateNested({ each: true })
    @Type(() => RecapCriterionScoreDto)
    @IsArray()
    @IsOptional()
    scores?: RecapCriterionScoreDto[];

    @IsString()
    @IsOptional()
    feedback?: string;
}

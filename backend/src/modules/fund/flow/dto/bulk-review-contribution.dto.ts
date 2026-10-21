import { ArrayMinSize, IsString } from "class-validator";
import { ReviewContributionDto } from "./review-contribution.dto";

export class BulkReviewContributionDto extends ReviewContributionDto {
    @IsString({ each: true })
    @ArrayMinSize(1)
    ids: string[];
}

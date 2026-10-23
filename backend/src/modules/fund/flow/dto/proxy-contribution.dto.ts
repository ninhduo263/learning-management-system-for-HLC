import { IsOptional, IsString } from "class-validator";
import { ContributionDto } from "./contribution.dto";

/** Leader nhóm / Admin HLC Fund nộp minh chứng hộ thành viên hoặc thầy cô */
export class ProxyContributionDto extends ContributionDto {
    @IsString()
    @IsOptional()
    memberId?: string;

    @IsString()
    @IsOptional()
    contributorId?: string;
}

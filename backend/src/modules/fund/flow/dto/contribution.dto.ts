import {
    ArrayMaxSize,
    ArrayMinSize,
    IsNumber,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    Min,
} from "class-validator";

export class ContributionDto {
    /** YYYY-MM-DD (giờ VN), không được ở tương lai */
    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    contributionDate: string;

    @IsNumber()
    @Min(1)
    amount: number;

    @IsString()
    @IsOptional()
    @MaxLength(1000)
    note?: string;

    /** Ảnh minh chứng đã upload qua POST /file */
    @IsString({ each: true })
    @ArrayMinSize(1)
    @ArrayMaxSize(10)
    fileIds: string[];
}

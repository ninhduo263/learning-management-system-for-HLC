import { IsIn, IsOptional, IsString } from "class-validator";

export class ReviewContributionDto {
    @IsIn(["DONE", "NOT_DONE"])
    status: "DONE" | "NOT_DONE";

    @IsString()
    @IsOptional()
    note?: string;
}

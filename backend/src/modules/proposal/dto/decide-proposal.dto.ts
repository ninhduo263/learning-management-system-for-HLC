import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class DecideProposalDto {
    @IsIn(["APPROVED", "REJECTED"])
    status: "APPROVED" | "REJECTED";

    @IsString()
    @IsOptional()
    @MaxLength(2000)
    note?: string;
}

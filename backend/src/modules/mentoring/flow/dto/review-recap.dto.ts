import { IsIn, IsOptional, IsString } from "class-validator";

export class ReviewRecapDto {
    @IsIn(["APPROVED", "REJECTED"])
    status: "APPROVED" | "REJECTED";

    /** Bắt buộc khi từ chối */
    @IsString()
    @IsOptional()
    note?: string;
}

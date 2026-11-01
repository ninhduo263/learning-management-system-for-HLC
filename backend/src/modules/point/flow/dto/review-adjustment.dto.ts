import { IsIn, IsNumber, IsOptional, IsString } from "class-validator";

export class ReviewAdjustmentDto {
    @IsIn(["APPROVED", "REJECTED"])
    status: "APPROVED" | "REJECTED";

    @IsString()
    @IsOptional()
    note?: string;

    /** Admin có thể sửa số điểm khi duyệt khiếu nại */
    @IsNumber()
    @IsOptional()
    points?: number;
}

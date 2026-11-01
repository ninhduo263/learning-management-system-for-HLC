import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

/** Bù chênh lệch cho tháng đã chi: ghi dòng điều chỉnh ở bảng tháng kế tiếp */
export class CarryOverDto {
    @IsString()
    @IsNotEmpty()
    memberId: string;

    /** Số tiền chênh lệch (âm = thu hồi), ví dụ 20000 */
    @Type(() => Number)
    @IsNumber({}, { message: "Số tiền chênh lệch phải là một số" })
    @IsOptional()
    amount?: number;

    /** Hoặc số điểm chênh lệch (tính theo đơn giá của tháng nhận bù) */
    @Type(() => Number)
    @IsNumber({}, { message: "Số điểm chênh lệch phải là một số" })
    @IsOptional()
    points?: number;

    @IsString({ message: "Cần nhập lý do" })
    @IsNotEmpty({ message: "Cần nhập lý do" })
    reason: string;
}

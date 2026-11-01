import { Type } from "class-transformer";
import {
    IsNumber,
    IsOptional,
    IsString,
    Matches,
    Max,
    Min,
    IsNotEmpty,
} from "class-validator";

export class PeriodSettingsDto {
    /** Số tiền cho 1 điểm (nhận cả số dạng chuỗi "10000") */
    @Type(() => Number)
    @IsNumber({}, { message: "Đơn giá phải là một số" })
    @Min(0, { message: "Đơn giá không được âm" })
    @Max(100000000, { message: "Đơn giá quá lớn" })
    @IsOptional()
    pointRate?: number;

    @Type(() => Number)
    @IsNumber({}, { message: "Phụ cấp cơ bản phải là một số" })
    @Min(0, { message: "Phụ cấp cơ bản không được âm" })
    @IsOptional()
    baseAllowance?: number;

    /** YYYY-MM-DD */
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: "Ngày chi trả phải có dạng YYYY-MM-DD",
    })
    @IsOptional()
    payoutDate?: string;

    /** Lý do sửa (bắt buộc, ghi nhật ký) */
    @IsString({ message: "Cần nhập lý do sửa" })
    @IsNotEmpty({ message: "Cần nhập lý do sửa đơn giá" })
    reason: string;
}

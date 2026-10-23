import { IsNotEmpty, IsString } from "class-validator";

export class UnlockPeriodDto {
    /** Bắt buộc: lý do mở khóa (ghi nhật ký) */
    @IsString({ message: "Cần nhập lý do mở khóa" })
    @IsNotEmpty({ message: "Cần nhập lý do mở khóa" })
    reason: string;
}

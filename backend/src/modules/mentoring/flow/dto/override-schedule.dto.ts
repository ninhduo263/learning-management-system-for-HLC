import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { ScheduleDto } from "./schedule.dto";

export class OverrideScheduleDto extends ScheduleDto {
    /** Bắt buộc: lý do ghi đè (lưu vào nhật ký, không sửa/xóa được) */
    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    reason: string;
}

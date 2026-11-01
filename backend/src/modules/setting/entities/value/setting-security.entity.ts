import { IsBoolean, IsOptional } from "class-validator";

/** Công tắc cấu hình do Admin toàn cục bật / tắt, không cần sửa code */
export class SettingSecurity {
    /** Bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên (tạm tắt trong giai đoạn thử nghiệm, bật khi lên production) */
    @IsBoolean()
    @IsOptional()
    forcePasswordChangeOnFirstLogin?: boolean;

    /** MTE / MTO tự sửa link profile (tạm thời tắt: chỉ Admin sửa) */
    @IsBoolean()
    @IsOptional()
    memberCanEditProfileUrl?: boolean;

    /**
     * Mở khóa kỳ đã xác nhận đã chi. Giai đoạn thử nghiệm: bật (mở khóa tự do). Production: tắt (chỉ mở khóa
     * kỳ chưa chi; kỳ đã chi xử lý bằng bù chênh lệch tháng sau).
     */
    @IsBoolean()
    @IsOptional()
    allowUnlockPaidPeriod?: boolean;
}

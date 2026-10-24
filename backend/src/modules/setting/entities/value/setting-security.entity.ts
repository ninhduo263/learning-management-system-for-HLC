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
}

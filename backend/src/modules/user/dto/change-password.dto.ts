import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class ChangePasswordDto {
    @IsNotEmpty({ message: "Nhập mật khẩu hiện tại" })
    @IsString()
    oldPass: string;

    @IsNotEmpty({ message: "Nhập mật khẩu mới" })
    @IsString()
    newPass: string;

    /** Xác nhận mật khẩu mới (giao diện bắt buộc nhập) */
    @IsString()
    @IsOptional()
    confirmPass?: string;
}

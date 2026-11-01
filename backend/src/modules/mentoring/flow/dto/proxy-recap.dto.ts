import {
    IsDateString,
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";

/** Admin nhập recap hộ khi MTE / MTO không tự đăng được */
export class ProxyRecapDto {
    @IsIn(["MENTOR", "MENTEE"])
    role: "MENTOR" | "MENTEE";

    @IsString()
    @IsNotEmpty()
    content: string;

    /** Ảnh minh chứng (không bắt buộc khi nhập hộ) */
    @IsString({ each: true })
    @IsOptional()
    fileIds?: string[];

    /** Thời điểm thành viên thực sự gửi recap (ISO); mặc định = lúc nhập */
    @IsDateString()
    @IsOptional()
    submittedAt?: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    reason: string;
}

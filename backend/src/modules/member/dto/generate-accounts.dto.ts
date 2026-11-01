import { IsOptional, IsString, MinLength } from "class-validator";

export class GenerateAccountsDto {
    /** Bỏ trống = mọi thành viên đang hoạt động chưa có tài khoản */
    @IsString({ each: true })
    @IsOptional()
    memberCodes?: string[];

    /** Dùng khi thành viên chưa có ngày sinh */
    @IsString()
    @MinLength(8)
    @IsOptional()
    defaultPassword?: string;
}

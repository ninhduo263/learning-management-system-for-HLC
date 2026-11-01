import { IsOptional, IsString } from "class-validator";

export class SetMockDateDto {
    /** YYYY-MM-DD, hoặc null để dùng ngày thật */
    @IsString()
    @IsOptional()
    date: string | null;
}

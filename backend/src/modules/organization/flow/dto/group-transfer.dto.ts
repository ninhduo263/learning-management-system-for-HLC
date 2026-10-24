import { IsArray, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class GroupTransferDto {
    @IsString()
    @IsNotEmpty({ message: "Chọn nhóm đích" })
    targetGroupId: string;

    /** Bỏ trống = chuyển toàn bộ thành viên (và thầy cô) */
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    memberIds?: string[];

    @IsString()
    @IsOptional()
    note?: string;
}

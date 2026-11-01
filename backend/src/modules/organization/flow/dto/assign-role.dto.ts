import { IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";

export class AssignRoleDto {
    @IsString()
    @IsNotEmpty()
    memberId: string;

    /** Vai trò (Position) thuộc đúng loại nhóm */
    @IsString()
    @IsNotEmpty()
    positionId: string;

    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: "Ngày bắt đầu phải có dạng YYYY-MM-DD",
    })
    @IsOptional()
    startDate?: string;

    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: "Ngày kết thúc phải có dạng YYYY-MM-DD",
    })
    @IsOptional()
    endDate?: string;

    @IsString()
    @IsOptional()
    note?: string;
}

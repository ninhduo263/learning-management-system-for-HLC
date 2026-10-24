import {
    IsArray,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
} from "class-validator";

export class DelegationDto {
    @IsString()
    @IsNotEmpty({ message: "Chọn nhóm" })
    groupId: string;

    @IsString()
    @IsNotEmpty({ message: "Chọn người nhận ủy quyền" })
    toMemberId: string;

    @IsArray({ message: "Chọn quyền được ủy quyền" })
    @IsString({ each: true })
    permissions: string[];

    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Ngày bắt đầu dạng YYYY-MM-DD" })
    startDate: string;

    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: "Ngày kết thúc dạng YYYY-MM-DD",
    })
    endDate: string;

    @IsString()
    @IsOptional()
    reason?: string;

    @IsString()
    @IsOptional()
    fromMemberId?: string;
}

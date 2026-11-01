import { IsArray, IsIn, IsOptional, IsString } from "class-validator";

export class ModuleAudienceDto {
    /** ALL: mọi thành viên đúng đối tượng; SELECTED: chỉ người / nhóm được chọn */
    @IsIn(["ALL", "SELECTED"], { message: "Chọn cách áp dụng module" })
    mode: "ALL" | "SELECTED";

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    memberIds?: string[];

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    groupIds?: string[];
}

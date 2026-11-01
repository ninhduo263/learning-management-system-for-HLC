import { IsArray, IsString } from "class-validator";

export class ModuleAdminsDto {
    /** Danh sách thành viên giữ chức vụ "Admin module <tên>" (đặt lại toàn bộ; rỗng = không còn admin module) */
    @IsArray()
    @IsString({ each: true })
    memberIds: string[];
}

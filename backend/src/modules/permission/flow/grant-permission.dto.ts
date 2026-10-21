import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { AdminScope } from "../common/constant";

export class GrantPermissionDto {
    /** Mã thành viên (HLC-MTE-00001) hoặc username */
    @IsString()
    @IsNotEmpty()
    account: string;

    @IsEnum(AdminScope)
    scope: AdminScope;

    /** Bắt buộc khi scope = LEARNING_MODULE */
    @IsString()
    @IsOptional()
    moduleId?: string;

    @IsString()
    @IsOptional()
    note?: string;
}

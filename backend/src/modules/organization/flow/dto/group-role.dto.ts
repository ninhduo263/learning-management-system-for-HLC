import { IsIn, IsOptional, IsString } from "class-validator";

export class GroupRoleDto {
    @IsIn(["LEADER", "DEPUTY"])
    role: "LEADER" | "DEPUTY";

    /** Bỏ trống để gỡ Leader / Phó nhóm hiện tại */
    @IsString()
    @IsOptional()
    memberId?: string;
}

import { IsIn, IsOptional } from "class-validator";

export class MemberListQueryDto {
    @IsIn(["MENTOR", "MENTEE"])
    @IsOptional()
    type?: "MENTOR" | "MENTEE";

    @IsIn(["true", "false"])
    @IsOptional()
    includeInactive?: string;
}

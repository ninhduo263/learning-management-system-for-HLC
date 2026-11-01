import { ArrayMinSize, IsOptional, IsString } from "class-validator";

export class GroupMembersDto {
    @IsString({ each: true })
    @ArrayMinSize(1)
    memberIds: string[];

    @IsString()
    @IsOptional()
    note?: string;
}

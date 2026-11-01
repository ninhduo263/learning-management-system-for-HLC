import {
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";
import { GroupKind } from "../../common/constant";

export class GroupDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    @IsBoolean()
    @IsOptional()
    deputyCanReview?: boolean;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    /** Chỉ đặt lúc tạo: MENTEE (nhóm MTE) hoặc FUND (nhóm HLC Fund của MTO) */
    @IsEnum(GroupKind)
    @IsOptional()
    groupKind?: GroupKind;
}

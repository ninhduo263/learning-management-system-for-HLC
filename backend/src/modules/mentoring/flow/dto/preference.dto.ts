import {
    ArrayMaxSize,
    ArrayMinSize,
    ArrayUnique,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
} from "class-validator";
import { MENTOR_CODE } from "./member-code";

export class PreferenceDto {
    @Matches(/^\d{4}Q[1-4]$/i)
    quarterCode: string;

    /** 3-10 mã mentor theo thứ tự ưu tiên */
    @Matches(MENTOR_CODE, { each: true })
    @ArrayUnique()
    @ArrayMinSize(3)
    @ArrayMaxSize(10)
    mentorCodes: string[];

    @IsString()
    @MaxLength(500)
    @IsOptional()
    message?: string;
}

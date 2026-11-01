import {
    ArrayNotEmpty,
    IsArray,
    IsIn,
    IsNotEmpty,
    IsString,
    Matches,
    MaxLength,
} from "class-validator";

export const RECAP_DELEGATION_ACTIONS = ["REVIEW", "PROXY"] as const;
export const RECAP_DELEGATION_SCOPES = ["PAIR", "GROUP"] as const;

export class RecapDelegationDto {
    /** Thành viên nhận ủy quyền */
    @IsString()
    @IsNotEmpty()
    toMemberId: string;

    @IsIn(RECAP_DELEGATION_SCOPES, {
        message: "Phạm vi là PAIR (một cặp) hoặc GROUP (một nhóm MTE)",
    })
    scopeType: "PAIR" | "GROUP";

    /** Id cặp mentoring (PAIR) hoặc id nhóm MTE (GROUP) */
    @IsString()
    @IsNotEmpty()
    scopeId: string;

    @IsArray()
    @ArrayNotEmpty({ message: "Chọn ít nhất một quyền được ủy quyền" })
    @IsIn(RECAP_DELEGATION_ACTIONS, { each: true })
    actions: ("REVIEW" | "PROXY")[];

    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Ngày bắt đầu dạng YYYY-MM-DD" })
    startDate: string;

    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: "Ngày kết thúc dạng YYYY-MM-DD",
    })
    endDate: string;

    @IsString()
    @IsNotEmpty({ message: "Cần nhập lý do ủy quyền" })
    @MaxLength(1000)
    reason: string;
}

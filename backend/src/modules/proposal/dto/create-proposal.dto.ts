import {
    IsIn,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";
import { ProposalType } from "../common/constant";

export class CreateProposalDto {
    @IsIn(Object.values(ProposalType), { message: "Loại đề xuất không hợp lệ" })
    type: ProposalType;

    /** Lý do / nội dung bình luận đề xuất (bắt buộc) */
    @IsString()
    @IsNotEmpty({ message: "Cần nhập lý do đề xuất" })
    @MaxLength(2000)
    reason: string;

    /** Đối tượng bị đề xuất: PAIR_CHANGE = id buổi mentoring; POINT_*: id thành viên; MENTORING_DATA: id dữ liệu gốc */
    @IsString()
    @IsNotEmpty()
    targetId: string;

    /** Chỉ MENTORING_DATA: SESSION | RECAP | MEMBER_SCORE | AWARD (dữ liệu mentoring gốc được bình luận) */
    @IsString()
    @IsOptional()
    targetType?: string;

    /**
     * Nội dung theo loại:
     * - PAIR_CHANGE: { mentorCode, menteeCode }
     * - POINT_ADJUST / MENTORING_POINT: { periodCode: "YYYY-MM", points, pointTypeCode? }
     */
    @IsObject()
    @IsOptional()
    payload?: Record<string, unknown>;
}

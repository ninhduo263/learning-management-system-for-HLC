import { AdminScope } from "@module/permission/common/constant";

/**
 * Đề xuất giữa các chức vụ (vòng 6): chức vụ không có quyền sửa gửi đề xuất kèm lý do cho chức vụ nắm quyền;
 * người nắm quyền duyệt hoặc từ chối. Mọi đề xuất được lưu lịch sử.
 */
export enum ProposalType {
    /** Trưởng ban MTE đề xuất đổi cặp mentoring cho MTE -> Trưởng ban Mentoring duyệt */
    PAIR_CHANGE = "PAIR_CHANGE",
    /** Trưởng ban MTE đề xuất sửa điểm phụ cấp -> Trưởng ban HLC Fund duyệt */
    POINT_ADJUST = "POINT_ADJUST",
    /** Trưởng ban Mentoring đề xuất điểm phụ cấp / thưởng có gốc từ mentoring -> Trưởng ban HLC Fund duyệt */
    MENTORING_POINT = "MENTORING_POINT",
    /** Trưởng ban Học tập bình luận đề xuất điều chỉnh dữ liệu mentoring -> Trưởng ban Mentoring duyệt */
    MENTORING_DATA = "MENTORING_DATA",
}

export enum ProposalStatus {
    PENDING = "PENDING",
    /** Đang áp dụng kết quả duyệt (chặn xử lý trùng) */
    PROCESSING = "PROCESSING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    /** Người đề xuất rút lại khi chưa được xử lý */
    CANCELLED = "CANCELLED",
}

/** Chức vụ nắm quyền quyết định */
export enum ProposalDecider {
    MENTORING = "MENTORING",
    FUND = "FUND",
}

export interface ProposalRule {
    label: string;
    /** Phạm vi quản trị của người được gửi đề xuất loại này */
    proposerScope: AdminScope;
    proposerLabel: string;
    decider: ProposalDecider;
    deciderLabel: string;
}

export const PROPOSAL_RULES: Record<ProposalType, ProposalRule> = {
    [ProposalType.PAIR_CHANGE]: {
        label: "Đổi cặp mentoring",
        proposerScope: AdminScope.MENTEE,
        proposerLabel: "Trưởng ban MTE",
        decider: ProposalDecider.MENTORING,
        deciderLabel: "Trưởng ban Mentoring",
    },
    [ProposalType.POINT_ADJUST]: {
        label: "Sửa điểm phụ cấp",
        proposerScope: AdminScope.MENTEE,
        proposerLabel: "Trưởng ban MTE",
        decider: ProposalDecider.FUND,
        deciderLabel: "Trưởng ban HLC Fund",
    },
    [ProposalType.MENTORING_POINT]: {
        label: "Điểm phụ cấp / thưởng từ mentoring",
        proposerScope: AdminScope.MENTORING,
        proposerLabel: "Trưởng ban Mentoring",
        decider: ProposalDecider.FUND,
        deciderLabel: "Trưởng ban HLC Fund",
    },
    [ProposalType.MENTORING_DATA]: {
        label: "Điều chỉnh dữ liệu mentoring",
        proposerScope: AdminScope.LEARNING,
        proposerLabel: "Trưởng ban Học tập",
        decider: ProposalDecider.MENTORING,
        deciderLabel: "Trưởng ban Mentoring",
    },
};

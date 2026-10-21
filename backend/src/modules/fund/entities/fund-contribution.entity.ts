import { EntityDefinition } from "@common/constant/class/entity-definition";
import { IsYYYYMMDD } from "@common/decorator/validate.decorator";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsDateString,
    IsEnum,
    IsOptional,
    IsPositive,
    IsString,
    MaxLength,
} from "class-validator";
import { FundContributionStatus } from "../common/constant";

export class FundContribution implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Thành viên", required: true })
    memberId: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Kỳ tháng", required: true })
    periodId: string;

    @IsYYYYMMDD()
    @EntityDefinition.field({ label: "Ngày đóng quỹ", required: true })
    contributionDate: string;

    @IsPositive()
    @EntityDefinition.field({ label: "Số tiền", required: true })
    amount: number;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Ghi chú" })
    note?: string;

    @IsDateString()
    @EntityDefinition.field({ label: "Thời điểm gửi", required: true })
    submittedAt: Date;

    @IsEnum(FundContributionStatus)
    @IsOptional()
    @EntityDefinition.field({
        label: "Trạng thái",
        enum: Object.values(FundContributionStatus),
    })
    status?: FundContributionStatus;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Người duyệt" })
    reviewedBy?: string;

    @IsDateString()
    @IsOptional()
    @EntityDefinition.field({ label: "Thời điểm duyệt" })
    reviewedAt?: Date;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Ghi chú duyệt" })
    reviewNote?: string;
}

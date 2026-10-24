import { ActivityLogService } from "@module/activity-log/activity-log.service";
import { ApiError } from "@config/exception/api-error";
import { vnDateKey } from "@common/utils/vn-date.util";
import { AdminScope } from "@module/permission/common/constant";
import { RolePermission } from "@module/organization/common/constant";
import { GroupAccessService } from "@module/organization/flow/group-access.service";
import { DepartmentModel } from "@module/organization/models/department.model";
import { MemberPositionModel } from "@module/organization/models/member-position.model";
import { PositionModel } from "@module/organization/models/position.model";
import { TimeService } from "@module/time/time.service";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op } from "sequelize";
import * as XLSX from "xlsx";
import { MemberStatus, MemberType } from "../common/constant";
import { MemberModel } from "../models/member.model";
import { ProvinceModel } from "../models/province.model";
import { ProvinceService } from "./province.service";

const TYPE_LABEL: Record<string, string> = {
    [MemberType.MENTEE]: "Mentee",
    [MemberType.MENTOR]: "Mentor",
};
const STATUS_LABEL: Record<string, string> = {
    ACTIVE: "Đang hoạt động",
    INACTIVE: "Ngừng hoạt động",
};
const dmy = (value?: string | null) =>
    value ? value.split("-").reverse().join("/") : "";

/**
 * Xuất xlsx danh sách thành viên bản đầy đủ: hồ sơ + nhóm + chức vụ + trạng thái. Thông tin cá nhân nhạy cảm
 * (số tài khoản, ngày sinh, SĐT, email, quê quán, địa chỉ) chỉ có khi người xuất có quyền
 * "Xuất dữ liệu cá nhân" (hoặc Admin toàn cục). Mỗi lần xuất được ghi nhật ký.
 */
@Injectable()
export class MemberExportService {
    constructor(
        private readonly groupAccess: GroupAccessService,
        private readonly activityLog: ActivityLogService,
        private readonly timeService: TimeService,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
        @InjectModel(ProvinceModel)
        private readonly provinceModel: typeof ProvinceModel,
        @InjectModel(MemberPositionModel)
        private readonly memberPositionModel: typeof MemberPositionModel,
        @InjectModel(PositionModel)
        private readonly positionModel: typeof PositionModel,
        @InjectModel(DepartmentModel)
        private readonly departmentModel: typeof DepartmentModel,
    ) {}

    async export(user: User, memberType?: string) {
        const caps = await this.groupAccess.capabilities(user);
        const personal =
            caps.superAdmin || caps.actions.has(RolePermission.EXPORT_PERSONAL);
        if (!personal && !caps.scopes.has(AdminScope.MENTEE))
            throw ApiError.Forbidden("error-action-forbidden");
        const type = Object.values(MemberType).includes(
            memberType as MemberType,
        )
            ? memberType
            : undefined;
        const members = await this.memberModel.findAll({
            where: type ? { memberType: type } : {},
            order: [
                ["memberType", "ASC"],
                ["memberCode", "ASC"],
            ],
            raw: true,
        });
        const provinces = new Map(
            (await this.provinceModel.findAll({ raw: true })).map((item) => [
                item.code,
                item.name,
            ]),
        );
        const groups = await this.groupAccess.groups(true);
        const groupMap = new Map(groups.map((item) => [item._id, item]));
        const memberships = await this.groupAccess.currentMemberships();
        const today = vnDateKey(this.timeService.now());
        const assignments = await this.memberPositionModel.findAll({
            where: {
                startDate: { [Op.lte]: today },
                [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: today } }],
            },
            raw: true,
        });
        const positions = new Map(
            (await this.positionModel.findAll({ raw: true })).map((item) => [
                item._id,
                item,
            ]),
        );
        const departments = new Map(
            (await this.departmentModel.findAll({ raw: true })).map((item) => [
                item._id,
                item,
            ]),
        );
        const groupName = (memberId: string, kind: string) =>
            memberships
                .filter(
                    (row) =>
                        row.memberId === memberId &&
                        (groupMap.get(row.groupId)?.groupKind ?? "MENTEE") ===
                            kind,
                )
                .map((row) => groupMap.get(row.groupId)?.name)
                .filter(Boolean)
                .join(", ");
        const roles = (memberId: string) =>
            assignments
                .filter((row) => row.memberId === memberId)
                .map(
                    (row) =>
                        `${positions.get(row.positionId)?.name ?? ""} - ${departments.get(row.departmentId)?.name ?? ""}${row.endDate ? ` (đến ${dmy(row.endDate)})` : ""}`,
                )
                .join("; ");
        const rows = members.map((member, index) => ({
            STT: index + 1,
            "Mã thành viên": member.memberCode,
            "Họ và tên": member.fullName,
            "Đối tượng": TYPE_LABEL[member.memberType] ?? member.memberType,
            "Trạng thái":
                STATUS_LABEL[member.status ?? MemberStatus.ACTIVE] ??
                member.status,
            "Giới tính":
                { MALE: "Nam", FEMALE: "Nữ", OTHER: "Khác" }[
                    member.gender as string
                ] ?? "",
            ...(personal && {
                "Ngày sinh": dmy(member.dateOfBirth),
                "Số điện thoại": member.phone ?? "",
                Email: member.email ?? "",
                "Quê quán": member.hometownCode
                    ? (provinces.get(member.hometownCode) ??
                      member.hometownCode)
                    : "",
                "Địa chỉ (tỉnh, thành phố)": member.addressCode
                    ? (provinces.get(member.addressCode) ?? member.addressCode)
                    : "",
                "Địa chỉ cũ (nhập tự do)": member.address ?? "",
                "Số tài khoản": member.bankAccount ?? "",
                "Ngân hàng": member.bankName ?? "",
            }),
            "Ngành học": member.major ?? "",
            "Ngành nghề": member.occupation ?? "",
            "Link profile": member.profileUrl ?? "",
            "Nhóm MTE": groupName(member._id, "MENTEE"),
            "Nhóm HLC Fund": groupName(member._id, "FUND"),
            "Chức vụ đang giữ": roles(member._id),
            "Ngày tham gia": dmy(member.joinedAt),
            "Bắt đầu phụ cấp": dmy(member.allowanceStartDate),
            "Diện phụ cấp sinh hoạt": member.livingAllowanceType ?? "",
            "Cần chọn lại tỉnh": ProvinceService.needsReview(member)
                ? "Có"
                : "",
            "Ghi chú": member.note ?? "",
        }));
        const sheet = XLSX.utils.json_to_sheet(rows);
        const header = Object.keys(rows[0] ?? { STT: "" });
        sheet["!cols"] = header.map((key) => ({
            wch: Math.min(Math.max(key.length + 2, 10), 40),
        }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, "Thanh vien");
        const buffer = XLSX.write(workbook, {
            type: "buffer",
            bookType: "xlsx",
        }) as Buffer;
        const label = type ? TYPE_LABEL[type].toLowerCase() : "tat-ca";
        const fileName = `danh-sach-thanh-vien-${label}-${today}${personal ? "" : "-co-ban"}.xlsx`;
        await this.activityLog.log(user, {
            module: "MEMBER",
            action: personal ? "MEMBER_EXPORT_PERSONAL" : "MEMBER_EXPORT",
            summary: `Xuất danh sách ${rows.length} thành viên (${type ? TYPE_LABEL[type] : "MTE và MTO"}) ${personal ? "bản đầy đủ có thông tin cá nhân" : "bản cơ bản, không có thông tin cá nhân"}`,
            detail: { memberType: type ?? "ALL", count: rows.length, personal },
        });
        return { fileName, buffer };
    }
}

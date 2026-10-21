import { Configuration } from "@config/configuration";
import { ApiError } from "@config/exception/api-error";
import { AttachmentOwnerType } from "@module/attachment/common/constant";
import { AttachmentModel } from "@module/attachment/models/attachment.model";
import { MemberStatus, MemberType } from "@module/member/common/constant";
import { Member } from "@module/member/entities/member.entity";
import { MemberModel } from "@module/member/models/member.model";
import { PeriodModel } from "@module/period/models/period.model";
import {
    PointEntryStatus,
    PointSourceType,
} from "@module/point/common/constant";
import { PointEntryModel } from "@module/point/models/point-entry.model";
import { FileModel } from "@module/repository/sequelize/model/file.model";
import { TimeService } from "@module/time/time.service";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/sequelize";
import { Op, Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import {
    MentoringPairSource,
    MentoringPairStatus,
    MentoringQuarterStatus,
    MentoringRole,
    RecapReviewStatus,
    ScheduleLogAction,
} from "../common/constant";
import { MentoringQuarter } from "../entities/mentoring-quarter.entity";
import { MentoringRecap } from "../entities/mentoring-recap.entity";
import { MentoringSession } from "../entities/mentoring-session.entity";
import { MentorPreferenceItemModel } from "../models/mentor-preference-item.model";
import { MentorPreferenceModel } from "../models/mentor-preference.model";
import { MentoringAwardModel } from "../models/mentoring-award.model";
import { MentoringPairModel } from "../models/mentoring-pair.model";
import { MentoringQuarterModel } from "../models/mentoring-quarter.model";
import { MentoringRecapModel } from "../models/mentoring-recap.model";
import { MentoringScheduleLogModel } from "../models/mentoring-schedule-log.model";
import { MentoringSessionModel } from "../models/mentoring-session.model";
import { CreatePairDto } from "./dto/create-pair.dto";
import { PreferenceDto } from "./dto/preference.dto";
import { RecapDto } from "./dto/recap.dto";
import { ReviewRecapDto } from "./dto/review-recap.dto";
import { ScheduleDto } from "./dto/schedule.dto";
import { UpdateSessionPairDto } from "./dto/update-session-pair.dto";
import {
    PairRecapStatus,
    QuarterRef,
    RECAP_WINDOW_MS,
    RoleRecapStatus,
    canAdminPair,
    canChoosePreference,
    canEditSchedule,
    canWriteRecap,
    combineRecapStatuses,
    importedRoleStatus,
    isVisibleToMember,
    isWithinMonth,
    monthKey,
    pad2,
    pairCode,
    pairRecapStatus,
    parseQuarterCode,
    quarterCode,
    quarterDates,
    quarterFromIndex,
    quarterIndex,
    quarterMonths,
    quarterOfDate,
    quarterTimeline,
    roleRecapStatus,
    sessionCode,
} from "./mentoring-rules";

type Plain<T> = T & { createdAt?: Date; updatedAt?: Date };

export interface MemberView {
    _id: string;
    memberCode: string;
    memberType: string;
    fullName: string;
    phone: string | null;
    email: string | null;
    profileUrl: string | null;
    status: string;
}

export interface RecapView {
    _id: string;
    role: string;
    memberCode: string;
    content: string;
    firstSubmittedAt: Date;
    lastSubmittedAt: Date;
    isLate: boolean;
    reviewStatus: string;
    reviewNote: string | null;
    reviewedAt: Date | null;
    media: {
        fileId: string | null;
        url: string;
        fileName: string | null;
        mimeType: string | null;
    }[];
}

export interface SessionView {
    _id: string;
    code: string;
    quarterCode: string;
    year: number;
    month: number;
    monthIndex: number;
    status: string;
    pair: { _id: string; code: string; status: string; source: string };
    mentor: MemberView | null;
    mentee: MemberView | null;
    schedule: {
        startAt: Date;
        endAt: Date;
        firstStartAt: Date;
        location: string | null;
        meetingLink: string | null;
        note: string | null;
        submittedAt: Date | null;
        submittedBy: string | null;
    } | null;
    recapDeadlineAt: Date | null;
    recaps: { mentor: RecapView | null; mentee: RecapView | null };
    recapStatus: {
        mentor: RoleRecapStatus;
        mentee: RoleRecapStatus;
        pair: PairRecapStatus;
        source: "SYSTEM" | "IMPORTED";
    };
    importedStatus: Record<string, string> | null;
}

export interface MySessionView extends SessionView {
    myRole: "MENTOR" | "MENTEE";
    canEditSchedule: boolean;
    canWriteRecap: boolean;
}

@Injectable()
export class MentoringFlowService {
    constructor(
        private readonly sequelize: Sequelize,
        private readonly timeService: TimeService,
        private readonly configService: ConfigService<Configuration>,
        @InjectModel(MentoringQuarterModel)
        private readonly quarterModel: typeof MentoringQuarterModel,
        @InjectModel(MentoringPairModel)
        private readonly pairModel: typeof MentoringPairModel,
        @InjectModel(MentoringSessionModel)
        private readonly sessionModel: typeof MentoringSessionModel,
        @InjectModel(MentoringRecapModel)
        private readonly recapModel: typeof MentoringRecapModel,
        @InjectModel(MentoringScheduleLogModel)
        private readonly scheduleLogModel: typeof MentoringScheduleLogModel,
        @InjectModel(MentoringAwardModel)
        private readonly awardModel: typeof MentoringAwardModel,
        @InjectModel(MentorPreferenceModel)
        private readonly preferenceModel: typeof MentorPreferenceModel,
        @InjectModel(MentorPreferenceItemModel)
        private readonly preferenceItemModel: typeof MentorPreferenceItemModel,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
        @InjectModel(PeriodModel)
        private readonly periodModel: typeof PeriodModel,
        @InjectModel(AttachmentModel)
        private readonly attachmentModel: typeof AttachmentModel,
        @InjectModel(FileModel)
        private readonly fileModel: typeof FileModel,
        @InjectModel(PointEntryModel)
        private readonly pointEntryModel: typeof PointEntryModel,
    ) {}

    now() {
        return this.timeService.now();
    }

    // ------------------------------------------------------------------
    // Thành viên
    // ------------------------------------------------------------------

    private toMemberView(member?: Plain<Member> | null): MemberView | null {
        if (!member) return null;
        return {
            _id: member._id,
            memberCode: member.memberCode,
            memberType: member.memberType,
            fullName: member.fullName,
            phone: member.phone ?? null,
            email: member.email ?? null,
            profileUrl: member.profileUrl ?? null,
            status: member.status,
        };
    }

    async listMembers(options: {
        type?: MemberType;
        includeInactive?: boolean;
    }) {
        const where: Record<string, unknown> = {};
        if (options.type) where.memberType = options.type;
        if (!options.includeInactive) where.status = MemberStatus.ACTIVE;
        const members = await this.memberModel.findAll({
            where,
            order: [["memberCode", "ASC"]],
            raw: true,
        });
        return members.map((member) => this.toMemberView(member));
    }

    async getMemberOfUser(user: User): Promise<Plain<Member>> {
        const member = await this.memberModel.findOne({
            where: { userId: user._id },
            raw: true,
        });
        if (!member) throw ApiError.NotFound("error-member-not-linked");
        return member;
    }

    private async findMemberByCode(code: string, type: MemberType) {
        const member = await this.memberModel.findOne({
            where: { memberCode: code.toUpperCase(), memberType: type },
            raw: true,
        });
        if (!member || member.status !== MemberStatus.ACTIVE) {
            throw ApiError.BadRequest("error-mentoring-member-invalid", {
                code: code.toUpperCase(),
            });
        }
        return member;
    }

    // ------------------------------------------------------------------
    // Quý
    // ------------------------------------------------------------------

    private quarterView(quarter: Plain<MentoringQuarter>) {
        const ref = { year: quarter.year, quarter: quarter.quarter };
        const now = this.now();
        return {
            ...quarter,
            months: quarterMonths(ref),
            canPair: canAdminPair(ref, now) && !quarter.isLocked,
            canChoosePreference: canChoosePreference(
                {
                    preferenceOpenAt: new Date(quarter.preferenceOpenAt),
                    pairingOpenAt: new Date(quarter.pairingOpenAt),
                },
                now,
            ),
            isVisibleToMember: isVisibleToMember(
                { visibleAt: new Date(quarter.visibleAt) },
                now,
            ),
            hasEnded: now >= new Date(`${quarter.endDate}T23:59:59.999+07:00`),
        };
    }

    async listQuarters() {
        const quarters = await this.quarterModel.findAll({
            order: [
                ["year", "DESC"],
                ["quarter", "DESC"],
            ],
            raw: true,
        });
        return quarters.map((quarter) => this.quarterView(quarter));
    }

    async getQuarterOrFail(code: string) {
        const ref = parseQuarterCode(code);
        const quarter = ref
            ? await this.quarterModel.findOne({
                  where: { code: quarterCode(ref) },
                  raw: true,
              })
            : null;
        if (!quarter) {
            throw ApiError.NotFound("error-mentoring-quarter-not-found", {
                code,
            });
        }
        return quarter;
    }

    /**
     * Tạo quý nếu chưa có. Được tạo quý hiện tại, hoặc quý kế tiếp từ ngày 5 tháng cuối quý hiện tại
     * (để mentee gửi nguyện vọng); admin chỉ ghép cặp quý kế tiếp từ ngày 10.
     */
    async ensureQuarter(code: string, user?: User, transaction?: Transaction) {
        const ref = parseQuarterCode(code);
        if (!ref)
            throw ApiError.BadRequest("error-mentoring-quarter-not-found", {
                code,
            });
        const existing = await this.quarterModel.findOne({
            where: { code: quarterCode(ref) },
            raw: true,
            transaction,
        });
        if (existing) return this.quarterView(existing);

        const now = this.now();
        const current = quarterIndex(quarterOfDate(now));
        const target = quarterIndex(ref);
        const timeline = quarterTimeline(ref);
        const allowed =
            target === current ||
            (target === current + 1 && now >= timeline.preferenceOpenAt);
        if (!allowed) {
            throw ApiError.BadRequest("error-mentoring-quarter-not-allowed", {
                code: quarterCode(ref),
            });
        }
        const run = async (t: Transaction) => {
            await this.ensurePeriods(ref, t);
            const created = await this.quarterModel.create(
                {
                    code: quarterCode(ref),
                    year: ref.year,
                    quarter: ref.quarter,
                    ...quarterDates(ref),
                    ...timeline,
                    status: MentoringQuarterStatus.ACTIVE,
                    createdBy: user?._id ?? null,
                },
                { transaction: t },
            );
            return created.get({ plain: true }) as Plain<MentoringQuarter>;
        };
        const quarter = transaction
            ? await run(transaction)
            : await this.sequelize.transaction(run);
        return this.quarterView(quarter);
    }

    /** Tạo 3 kỳ tháng của quý (nếu chưa có) để gắn buổi mentoring và tính điểm */
    private async ensurePeriods(ref: QuarterRef, transaction: Transaction) {
        const periods = new Map<number, string>();
        for (const month of quarterMonths(ref)) {
            const code = monthKey(ref.year, month);
            let period = await this.periodModel.findOne({
                where: { code },
                transaction,
            });
            if (!period) {
                const lastDay = new Date(
                    Date.UTC(ref.year, month, 0),
                ).getUTCDate();
                const next =
                    month === 12
                        ? { year: ref.year + 1, month: 1 }
                        : { year: ref.year, month: month + 1 };
                period = await this.periodModel.create(
                    {
                        code,
                        year: ref.year,
                        month,
                        startDate: `${code}-01`,
                        endDate: `${code}-${pad2(lastDay)}`,
                        payoutDate: `${monthKey(next.year, next.month)}-10`,
                    },
                    { transaction },
                );
            }
            periods.set(month, period._id);
        }
        return periods;
    }

    async setQuarterLock(code: string, isLocked: boolean, user: User) {
        const quarter = await this.getQuarterOrFail(code);
        await this.quarterModel.update(
            {
                isLocked,
                lockedAt: isLocked ? this.now() : null,
                lockedBy: isLocked ? user._id : null,
            },
            { where: { _id: quarter._id } },
        );
        return this.quarterView({ ...quarter, isLocked });
    }

    private assertQuarterWritable(quarter: Plain<MentoringQuarter>) {
        if (quarter.isLocked) {
            throw ApiError.Conflict("error-mentoring-quarter-locked", {
                code: quarter.code,
            });
        }
    }

    private assertCanPair(quarter: Plain<MentoringQuarter>) {
        this.assertQuarterWritable(quarter);
        if (
            !canAdminPair(
                { year: quarter.year, quarter: quarter.quarter },
                this.now(),
            )
        ) {
            throw ApiError.Conflict("error-mentoring-pairing-closed", {
                code: quarter.code,
            });
        }
    }

    // ------------------------------------------------------------------
    // Dựng dữ liệu hiển thị
    // ------------------------------------------------------------------

    private fileUrl(fileId: string, fileName: string) {
        const address = this.configService.get("server.address", {
            infer: true,
        });
        return `${address}/file/${fileId}/${encodeURIComponent(fileName)}`;
    }

    private async buildSessionViews(
        sessions: Plain<MentoringSession>[],
    ): Promise<SessionView[]> {
        if (!sessions.length) return [];
        const now = this.now();
        const pairIds = [...new Set(sessions.map((session) => session.pairId))];
        const periodIds = [
            ...new Set(sessions.map((session) => session.periodId)),
        ];
        const sessionIds = sessions.map((session) => session._id);
        const [pairs, periods, recaps] = await Promise.all([
            this.pairModel.findAll({ where: { _id: pairIds }, raw: true }),
            this.periodModel.findAll({ where: { _id: periodIds }, raw: true }),
            this.recapModel.findAll({
                where: { sessionId: sessionIds },
                raw: true,
            }),
        ]);
        const quarterIds = [...new Set(pairs.map((pair) => pair.quarterId))];
        const memberIds = [
            ...new Set(pairs.flatMap((pair) => [pair.mentorId, pair.menteeId])),
            ...new Set(
                sessions
                    .map((session) => session.scheduleSubmittedBy)
                    .filter(Boolean),
            ),
        ];
        const [quarters, members, attachments] = await Promise.all([
            this.quarterModel.findAll({
                where: { _id: quarterIds },
                raw: true,
            }),
            this.memberModel.findAll({ where: { _id: memberIds }, raw: true }),
            recaps.length
                ? this.attachmentModel.findAll({
                      where: {
                          ownerType: AttachmentOwnerType.MENTORING_RECAP,
                          ownerId: recaps.map((recap) => recap._id),
                      },
                      order: [["sortOrder", "ASC"]],
                      raw: true,
                  })
                : [],
        ]);
        const byId = <T extends { _id: string }>(items: T[]) =>
            new Map(items.map((item) => [item._id, item]));
        const pairMap = byId(pairs);
        const periodMap = byId(periods);
        const quarterMap = byId(quarters);
        const memberMap = byId(members);
        const recapView = (recap?: Plain<MentoringRecap>): RecapView | null =>
            recap
                ? {
                      _id: recap._id,
                      role: recap.role,
                      memberCode:
                          memberMap.get(recap.memberId)?.memberCode ?? null,
                      content: recap.content,
                      firstSubmittedAt: recap.firstSubmittedAt,
                      lastSubmittedAt: recap.lastSubmittedAt,
                      isLate: recap.isLate,
                      reviewStatus: recap.reviewStatus,
                      reviewNote: recap.reviewNote ?? null,
                      reviewedAt: recap.reviewedAt ?? null,
                      media: attachments
                          .filter((item) => item.ownerId === recap._id)
                          .map((item) => ({
                              fileId: item.fileId ?? null,
                              url: item.url,
                              fileName: item.fileName ?? null,
                              mimeType: item.mimeType ?? null,
                          })),
                  }
                : null;

        return sessions
            .map((session) => {
                const pair = pairMap.get(session.pairId);
                const period = periodMap.get(session.periodId);
                const quarter = pair && quarterMap.get(pair.quarterId);
                const mentorRecap = recaps.find(
                    (recap) =>
                        recap.sessionId === session._id &&
                        recap.role === MentoringRole.MENTOR,
                );
                const menteeRecap = recaps.find(
                    (recap) =>
                        recap.sessionId === session._id &&
                        recap.role === MentoringRole.MENTEE,
                );
                const imported =
                    !session.scheduledStartAt && session.importedStatus;
                const mentorStatus = imported
                    ? (importedRoleStatus(session, "MENTOR") ?? "NO_SCHEDULE")
                    : roleRecapStatus(session, mentorRecap, now);
                const menteeStatus = imported
                    ? (importedRoleStatus(session, "MENTEE") ?? "NO_SCHEDULE")
                    : roleRecapStatus(session, menteeRecap, now);
                const pairStatus = imported
                    ? combineRecapStatuses(mentorStatus, menteeStatus)
                    : pairRecapStatus(session, mentorStatus, menteeStatus);
                return {
                    _id: session._id,
                    code: session.code,
                    quarterCode: quarter?.code ?? null,
                    year: period?.year ?? null,
                    month: period?.month ?? null,
                    monthIndex: session.monthIndex,
                    status: session.status,
                    pair: pair
                        ? {
                              _id: pair._id,
                              code: pair.code,
                              status: pair.status,
                              source: pair.source,
                          }
                        : null,
                    mentor: this.toMemberView(
                        pair && memberMap.get(pair.mentorId),
                    ),
                    mentee: this.toMemberView(
                        pair && memberMap.get(pair.menteeId),
                    ),
                    schedule: session.scheduledStartAt
                        ? {
                              startAt: session.scheduledStartAt,
                              endAt: session.scheduledEndAt,
                              firstStartAt: session.firstScheduledStartAt,
                              location: session.location ?? null,
                              meetingLink: session.meetingLink ?? null,
                              note: session.scheduleNote ?? null,
                              submittedAt: session.scheduleSubmittedAt ?? null,
                              submittedBy:
                                  memberMap.get(session.scheduleSubmittedBy)
                                      ?.memberCode ?? null,
                          }
                        : null,
                    recapDeadlineAt: session.recapDeadlineAt ?? null,
                    recaps: {
                        mentor: recapView(mentorRecap),
                        mentee: recapView(menteeRecap),
                    },
                    recapStatus: {
                        mentor: mentorStatus,
                        mentee: menteeStatus,
                        pair: pairStatus,
                        source: (imported ? "IMPORTED" : "SYSTEM") as
                            | "IMPORTED"
                            | "SYSTEM",
                    },
                    importedStatus:
                        (session.importedStatus as Record<string, string>) ??
                        null,
                };
            })
            .sort(
                (a, b) =>
                    (a.month ?? 0) - (b.month ?? 0) ||
                    a.code.localeCompare(b.code),
            );
    }

    // ------------------------------------------------------------------
    // Admin: bảng ghép cặp của quý
    // ------------------------------------------------------------------

    async getQuarterBoard(code: string) {
        const quarter = await this.getQuarterOrFail(code);
        const pairs = await this.pairModel.findAll({
            where: { quarterId: quarter._id },
            raw: true,
        });
        const sessions = pairs.length
            ? await this.sessionModel.findAll({
                  where: { pairId: pairs.map((pair) => pair._id) },
                  raw: true,
              })
            : [];
        const [sessionViews, preferences] = await Promise.all([
            this.buildSessionViews(sessions),
            this.getQuarterPreferences(quarter._id),
        ]);
        return {
            quarter: this.quarterView(quarter),
            sessions: sessionViews,
            preferences,
        };
    }

    private async getQuarterPreferences(quarterId: string) {
        const preferences = await this.preferenceModel.findAll({
            where: { quarterId },
            raw: true,
        });
        if (!preferences.length) return [];
        const items = await this.preferenceItemModel.findAll({
            where: { preferenceId: preferences.map((item) => item._id) },
            order: [["priority", "ASC"]],
            raw: true,
        });
        const members = await this.memberModel.findAll({
            where: {
                _id: [
                    ...preferences.map((item) => item.menteeId),
                    ...items.map((item) => item.mentorId),
                ],
            },
            raw: true,
        });
        const codeOf = new Map(
            members.map((member) => [member._id, member.memberCode]),
        );
        return preferences.map((preference) => ({
            _id: preference._id,
            menteeCode: codeOf.get(preference.menteeId),
            mentorCodes: items
                .filter((item) => item.preferenceId === preference._id)
                .map((item) => codeOf.get(item.mentorId)),
            message: preference.message ?? null,
            submittedAt: preference.submittedAt,
        }));
    }

    // ------------------------------------------------------------------
    // Admin: ghép / sửa / xóa cặp
    // ------------------------------------------------------------------

    async createPair(
        code: string,
        dto: CreatePairDto,
        user: User,
        source = MentoringPairSource.MANUAL,
    ) {
        const quarter = await this.getQuarterOrFail(code);
        this.assertCanPair(quarter);
        return this.sequelize.transaction((t) =>
            this.createPairInTransaction(quarter, dto, user, source, null, t),
        );
    }

    /** Import: không giới hạn cửa sổ ghép cặp (cho phép nhập dữ liệu cũ), chỉ cần quý chưa khóa */
    async createPairFromImport(
        code: string,
        dto: CreatePairDto,
        importedStatus: Record<number, Record<string, string>>,
        user: User,
    ) {
        const quarter = await this.getQuarterOrFail(code);
        this.assertQuarterWritable(quarter);
        return this.sequelize.transaction((t) =>
            this.createPairInTransaction(
                quarter,
                dto,
                user,
                MentoringPairSource.IMPORT,
                Object.keys(importedStatus).length ? importedStatus : null,
                t,
            ),
        );
    }

    private async createPairInTransaction(
        quarter: Plain<MentoringQuarter>,
        dto: CreatePairDto,
        user: User,
        source: MentoringPairSource,
        importedStatus: Record<number, Record<string, string>> | null,
        t: Transaction,
    ) {
        const ref = { year: quarter.year, quarter: quarter.quarter };
        const months = quarterMonths(ref);
        if (!months.includes(Number(dto.month))) {
            throw ApiError.BadRequest("error-mentoring-month-invalid", {
                month: dto.month,
                code: quarter.code,
            });
        }
        const mentor = await this.findMemberByCode(
            dto.mentorCode,
            MemberType.MENTOR,
        );
        const mentee = await this.findMemberByCode(
            dto.menteeCode,
            MemberType.MENTEE,
        );
        let pair = await this.pairModel.findOne({
            where: {
                quarterId: quarter._id,
                menteeId: mentee._id,
                status: MentoringPairStatus.ACTIVE,
            },
            transaction: t,
            raw: true,
        });
        if (pair && pair.mentorId !== mentor._id) {
            throw ApiError.Conflict("error-mentoring-mentee-already-paired", {
                code: mentee.memberCode,
            });
        }
        if (!pair) {
            const created = await this.pairModel.create(
                {
                    quarterId: quarter._id,
                    mentorId: mentor._id,
                    menteeId: mentee._id,
                    code: pairCode(ref, mentor.memberCode, mentee.memberCode),
                    source,
                    createdBy: user._id,
                },
                { transaction: t },
            );
            pair = created.get({ plain: true });
        }
        const periods = await this.ensurePeriods(ref, t);
        const existing = await this.sessionModel.findAll({
            where: { pairId: pair._id },
            transaction: t,
            raw: true,
        });
        const syncedMonths: number[] = [];
        for (const month of months.filter(
            (value) => value >= Number(dto.month),
        )) {
            const periodId = periods.get(month);
            const imported = importedStatus?.[month] ?? null;
            const session = existing.find((item) => item.periodId === periodId);
            if (session) {
                if (imported) {
                    await this.sessionModel.update(
                        { importedStatus: imported },
                        { where: { _id: session._id }, transaction: t },
                    );
                }
                continue;
            }
            await this.sessionModel.create(
                {
                    pairId: pair._id,
                    periodId,
                    monthIndex: months.indexOf(month) + 1,
                    code: sessionCode(
                        ref,
                        month,
                        mentor.memberCode,
                        mentee.memberCode,
                    ),
                    importedStatus: imported,
                },
                { transaction: t },
            );
            syncedMonths.push(month);
        }
        return { pair, syncedMonths, created: syncedMonths.length > 0 };
    }

    private async getSessionContext(
        sessionId: string,
        transaction?: Transaction,
    ) {
        const session = await this.sessionModel.findOne({
            where: { _id: sessionId },
            raw: true,
            transaction,
        });
        if (!session)
            throw ApiError.NotFound("error-mentoring-session-not-found");
        const pair = await this.pairModel.findOne({
            where: { _id: session.pairId },
            raw: true,
            transaction,
        });
        const quarter = await this.quarterModel.findOne({
            where: { _id: pair.quarterId },
            raw: true,
            transaction,
        });
        const period = await this.periodModel.findOne({
            where: { _id: session.periodId },
            raw: true,
            transaction,
        });
        return { session, pair, quarter, period };
    }

    /** Đổi mentor/mentee của buổi này và các tháng sau trong quý */
    async updateSessionPair(
        sessionId: string,
        dto: UpdateSessionPairDto,
        user: User,
    ) {
        const { session, pair, quarter } =
            await this.getSessionContext(sessionId);
        this.assertCanPair(quarter);
        const mentor = await this.findMemberByCode(
            dto.mentorCode,
            MemberType.MENTOR,
        );
        const mentee = await this.findMemberByCode(
            dto.menteeCode,
            MemberType.MENTEE,
        );
        if (mentor._id === pair.mentorId && mentee._id === pair.menteeId) {
            return { changed: false, movedSessions: 0 };
        }
        const ref = { year: quarter.year, quarter: quarter.quarter };
        return this.sequelize.transaction(async (t) => {
            const pairSessions = await this.sessionModel.findAll({
                where: { pairId: pair._id },
                raw: true,
                transaction: t,
            });
            const periods = await this.periodModel.findAll({
                where: { _id: pairSessions.map((item) => item.periodId) },
                raw: true,
                transaction: t,
            });
            const monthOf = new Map(
                periods.map((period) => [period._id, period.month]),
            );
            const fromMonth = monthOf.get(session.periodId);
            const moving = pairSessions.filter(
                (item) => monthOf.get(item.periodId) >= fromMonth,
            );
            const staying = pairSessions.filter(
                (item) => monthOf.get(item.periodId) < fromMonth,
            );
            const recapCount = await this.recapModel.count({
                where: { sessionId: moving.map((item) => item._id) },
                transaction: t,
            });
            if (recapCount > 0) {
                throw ApiError.Conflict("error-mentoring-session-has-recap");
            }
            if (mentee._id !== pair.menteeId) {
                const other = await this.pairModel.findOne({
                    where: {
                        quarterId: quarter._id,
                        menteeId: mentee._id,
                        status: MentoringPairStatus.ACTIVE,
                    },
                    raw: true,
                    transaction: t,
                });
                if (other) {
                    throw ApiError.Conflict(
                        "error-mentoring-mentee-already-paired",
                        {
                            code: mentee.memberCode,
                        },
                    );
                }
            }
            // Cặp cũ: còn tháng trước thì kết thúc, không còn thì xóa sau khi chuyển buổi
            await this.pairModel.update(
                { status: MentoringPairStatus.ENDED },
                { where: { _id: pair._id }, transaction: t },
            );
            const created = await this.pairModel.create(
                {
                    quarterId: quarter._id,
                    mentorId: mentor._id,
                    menteeId: mentee._id,
                    code: pairCode(ref, mentor.memberCode, mentee.memberCode),
                    source: MentoringPairSource.MANUAL,
                    createdBy: user._id,
                },
                { transaction: t },
            );
            for (const item of moving) {
                await this.sessionModel.update(
                    {
                        pairId: created._id,
                        code: sessionCode(
                            ref,
                            monthOf.get(item.periodId),
                            mentor.memberCode,
                            mentee.memberCode,
                        ),
                        scheduledStartAt: null,
                        scheduledEndAt: null,
                        firstScheduledStartAt: null,
                        recapDeadlineAt: null,
                        scheduleSubmittedAt: null,
                        scheduleSubmittedBy: null,
                    },
                    { where: { _id: item._id }, transaction: t },
                );
                if (item.scheduledStartAt) {
                    await this.scheduleLogModel.create(
                        {
                            sessionId: item._id,
                            action: ScheduleLogAction.CANCEL,
                            oldStartAt: item.scheduledStartAt,
                            oldEndAt: item.scheduledEndAt,
                            actorUserId: user._id,
                            reason: "Đổi cặp mentoring",
                        },
                        { transaction: t },
                    );
                }
            }
            if (!staying.length) {
                await this.pairModel.destroy({
                    where: { _id: pair._id },
                    transaction: t,
                });
            }
            return {
                changed: true,
                movedSessions: moving.length,
                pairCode: created.code,
            };
        });
    }

    /** Xóa buổi này và các tháng sau của cùng cặp (kèm recap, lịch sử lịch, giải, điểm liên quan) */
    async deleteSessionsFrom(sessionId: string, user: User) {
        const { session, pair, quarter } =
            await this.getSessionContext(sessionId);
        this.assertCanPair(quarter);
        return this.sequelize.transaction(async (t) => {
            const pairSessions = await this.sessionModel.findAll({
                where: { pairId: pair._id },
                raw: true,
                transaction: t,
            });
            const periods = await this.periodModel.findAll({
                where: { _id: pairSessions.map((item) => item.periodId) },
                raw: true,
                transaction: t,
            });
            const monthOf = new Map(
                periods.map((period) => [period._id, period.month]),
            );
            const fromMonth = monthOf.get(session.periodId);
            const targets = pairSessions.filter(
                (item) => monthOf.get(item.periodId) >= fromMonth,
            );
            const targetIds = targets.map((item) => item._id);
            const recaps = await this.recapModel.findAll({
                where: { sessionId: targetIds },
                raw: true,
                transaction: t,
            });
            const awards = await this.awardModel.findAll({
                where: { sessionId: targetIds },
                raw: true,
                transaction: t,
            });
            const sourceIds = [
                ...recaps.map((item) => item._id),
                ...awards.map((item) => item._id),
            ];
            const [voided] = sourceIds.length
                ? await this.pointEntryModel.update(
                      {
                          status: PointEntryStatus.VOID,
                          voidReason: "Xóa cặp mentoring",
                          voidedAt: this.now(),
                          voidedBy: user._id,
                      },
                      {
                          where: {
                              status: PointEntryStatus.ACTIVE,
                              sourceType: [
                                  PointSourceType.MENTORING_RECAP,
                                  PointSourceType.MENTORING_AWARD,
                              ],
                              sourceId: sourceIds,
                          },
                          transaction: t,
                      },
                  )
                : [0];
            const deletedAttachments = recaps.length
                ? await this.attachmentModel.destroy({
                      where: {
                          ownerType: AttachmentOwnerType.MENTORING_RECAP,
                          ownerId: recaps.map((item) => item._id),
                      },
                      transaction: t,
                  })
                : 0;
            const deletedRecaps = await this.recapModel.destroy({
                where: { sessionId: targetIds },
                transaction: t,
            });
            const deletedAwards = await this.awardModel.destroy({
                where: { sessionId: targetIds },
                transaction: t,
            });
            const deletedLogs = await this.scheduleLogModel.destroy({
                where: { sessionId: targetIds },
                transaction: t,
            });
            const deletedSessions = await this.sessionModel.destroy({
                where: { _id: targetIds },
                transaction: t,
            });
            const remaining = pairSessions.length - targets.length;
            if (!remaining) {
                await this.pairModel.destroy({
                    where: { _id: pair._id },
                    transaction: t,
                });
            }
            return {
                deletedMonths: targets
                    .map((item) => monthOf.get(item.periodId))
                    .sort((a, b) => a - b),
                deleted: {
                    sessions: deletedSessions,
                    recaps: deletedRecaps,
                    attachments: deletedAttachments,
                    scheduleLogs: deletedLogs,
                    awards: deletedAwards,
                    pair: remaining ? 0 : 1,
                },
                voidedPointEntries: voided,
            };
        });
    }

    // ------------------------------------------------------------------
    // Lịch mentoring
    // ------------------------------------------------------------------

    private memberRoleInPair(
        member: Plain<Member>,
        pair: { mentorId: string; menteeId: string },
    ) {
        if (pair.mentorId === member._id) return MentoringRole.MENTOR;
        if (pair.menteeId === member._id) return MentoringRole.MENTEE;
        return null;
    }

    /** Mentor/mentee gửi lịch đã chốt (hoặc sửa khi chưa tới thời điểm chốt lần đầu) */
    async submitSchedule(sessionId: string, dto: ScheduleDto, user: User) {
        const member = await this.getMemberOfUser(user);
        const context = await this.getSessionContext(sessionId);
        const { session, pair, quarter } = context;
        if (
            !this.memberRoleInPair(member, pair) ||
            pair.status === MentoringPairStatus.CANCELLED
        ) {
            throw ApiError.Forbidden("error-mentoring-not-participant");
        }
        this.assertQuarterWritable(quarter);
        const now = this.now();
        if (
            !isVisibleToMember({ visibleAt: new Date(quarter.visibleAt) }, now)
        ) {
            throw ApiError.Conflict("error-mentoring-not-visible");
        }
        if (!canEditSchedule(session, now)) {
            throw ApiError.Conflict("error-mentoring-schedule-locked");
        }
        const { startAt, endAt } = this.validateScheduleTimes(
            dto,
            context.period,
        );
        if (startAt <= now)
            throw ApiError.BadRequest("error-mentoring-schedule-past");
        return this.saveSchedule(
            context,
            dto,
            startAt,
            endAt,
            user,
            member._id,
            false,
        );
    }

    /** Admin ghi đè lịch (bỏ qua quy tắc khóa sửa và thời điểm ở quá khứ) */
    async overrideSchedule(sessionId: string, dto: ScheduleDto, user: User) {
        const context = await this.getSessionContext(sessionId);
        this.assertQuarterWritable(context.quarter);
        const { startAt, endAt } = this.validateScheduleTimes(
            dto,
            context.period,
        );
        return this.saveSchedule(
            context,
            dto,
            startAt,
            endAt,
            user,
            null,
            true,
        );
    }

    private validateScheduleTimes(
        dto: ScheduleDto,
        period: { year: number; month: number },
    ) {
        const startAt = new Date(dto.startAt);
        const endAt = new Date(dto.endAt);
        if (endAt <= startAt)
            throw ApiError.BadRequest("error-mentoring-schedule-range");
        if (!isWithinMonth(startAt, endAt, period.year, period.month)) {
            throw ApiError.BadRequest("error-mentoring-schedule-month", {
                month: `${pad2(period.month)}/${period.year}`,
            });
        }
        return { startAt, endAt };
    }

    private async saveSchedule(
        context: Awaited<ReturnType<MentoringFlowService["getSessionContext"]>>,
        dto: ScheduleDto,
        startAt: Date,
        endAt: Date,
        user: User,
        memberId: string | null,
        isOverride: boolean,
    ) {
        const { session } = context;
        const now = this.now();
        await this.sequelize.transaction(async (t) => {
            await this.sessionModel.update(
                {
                    scheduledStartAt: startAt,
                    scheduledEndAt: endAt,
                    firstScheduledStartAt:
                        session.firstScheduledStartAt ?? startAt,
                    recapDeadlineAt: new Date(
                        startAt.getTime() + RECAP_WINDOW_MS,
                    ),
                    location: dto.location ?? null,
                    meetingLink: dto.meetingLink ?? null,
                    scheduleNote: dto.note ?? null,
                    scheduleSubmittedAt: now,
                    scheduleSubmittedBy:
                        memberId ?? session.scheduleSubmittedBy ?? null,
                },
                { where: { _id: session._id }, transaction: t },
            );
            await this.scheduleLogModel.create(
                {
                    sessionId: session._id,
                    action: isOverride
                        ? ScheduleLogAction.ADMIN_OVERRIDE
                        : session.scheduledStartAt
                          ? ScheduleLogAction.UPDATE
                          : ScheduleLogAction.CREATE,
                    oldStartAt: session.scheduledStartAt ?? null,
                    oldEndAt: session.scheduledEndAt ?? null,
                    newStartAt: startAt,
                    newEndAt: endAt,
                    actorUserId: user._id,
                },
                { transaction: t },
            );
        });
        const [view] = await this.buildSessionViews([
            await this.sessionModel.findOne({
                where: { _id: session._id },
                raw: true,
            }),
        ]);
        return view;
    }

    // ------------------------------------------------------------------
    // Recap
    // ------------------------------------------------------------------

    async submitRecap(sessionId: string, dto: RecapDto, user: User) {
        const member = await this.getMemberOfUser(user);
        const { session, pair, quarter } =
            await this.getSessionContext(sessionId);
        const role = this.memberRoleInPair(member, pair);
        if (!role) throw ApiError.Forbidden("error-mentoring-not-participant");
        this.assertQuarterWritable(quarter);
        const now = this.now();
        const existing = await this.recapModel.findOne({
            where: { sessionId: session._id, role },
            raw: true,
        });
        if (existing?.reviewStatus === RecapReviewStatus.APPROVED) {
            throw ApiError.Conflict("error-mentoring-recap-approved");
        }
        if (!canWriteRecap(session, existing, now)) {
            throw ApiError.Conflict("error-mentoring-recap-too-early");
        }
        const fileIds = [...new Set(dto.fileIds)];
        const files = await this.fileModel.findAll({
            where: { _id: fileIds },
            attributes: ["_id", "name", "mimetype"],
            raw: true,
        });
        if (files.length !== fileIds.length) {
            throw ApiError.BadRequest("error-mentoring-recap-file-invalid");
        }
        if (!files.some((file) => String(file.mimetype).startsWith("image/"))) {
            throw ApiError.BadRequest("error-mentoring-recap-image-required");
        }
        const isLate =
            now.getTime() > new Date(session.recapDeadlineAt).getTime();
        // Bị từ chối rồi nộp lại = nộp mới: tính lại thời điểm nộp và nộp muộn
        const resetTiming =
            !existing || existing.reviewStatus === RecapReviewStatus.REJECTED;
        await this.sequelize.transaction(async (t) => {
            let recapId = existing?._id;
            if (existing) {
                await this.recapModel.update(
                    {
                        content: dto.content.trim(),
                        lastSubmittedAt: now,
                        ...(resetTiming
                            ? { firstSubmittedAt: now, isLate }
                            : {}),
                        reviewStatus: RecapReviewStatus.PENDING,
                        reviewedBy: null,
                        reviewedAt: null,
                    },
                    { where: { _id: existing._id }, transaction: t },
                );
            } else {
                const created = await this.recapModel.create(
                    {
                        sessionId: session._id,
                        memberId: member._id,
                        role,
                        content: dto.content.trim(),
                        firstSubmittedAt: now,
                        lastSubmittedAt: now,
                        isLate,
                    },
                    { transaction: t },
                );
                recapId = created._id;
            }
            await this.attachmentModel.destroy({
                where: {
                    ownerType: AttachmentOwnerType.MENTORING_RECAP,
                    ownerId: recapId,
                },
                transaction: t,
            });
            await this.attachmentModel.bulkCreate(
                fileIds.map((fileId, index) => {
                    const file = files.find((item) => item._id === fileId);
                    return {
                        ownerType: AttachmentOwnerType.MENTORING_RECAP,
                        ownerId: recapId,
                        fileId,
                        url: this.fileUrl(fileId, file.name),
                        fileName: file.name,
                        mimeType: file.mimetype,
                        sortOrder: index,
                        uploadedBy: user._id,
                    };
                }),
                { transaction: t },
            );
        });
        const [view] = await this.buildSessionViews([session]);
        return view;
    }

    async reviewRecap(recapId: string, dto: ReviewRecapDto, user: User) {
        const recap = await this.recapModel.findOne({
            where: { _id: recapId },
            raw: true,
        });
        if (!recap) throw ApiError.NotFound("error-record-not-found");
        const { quarter } = await this.getSessionContext(recap.sessionId);
        this.assertQuarterWritable(quarter);
        if (dto.status === "REJECTED" && !dto.note?.trim()) {
            throw ApiError.BadRequest("error-mentoring-review-note-required");
        }
        await this.recapModel.update(
            {
                reviewStatus: dto.status,
                reviewNote: dto.note?.trim() || null,
                reviewedBy: user._id,
                reviewedAt: this.now(),
            },
            { where: { _id: recap._id } },
        );
        const [view] = await this.buildSessionViews([
            await this.sessionModel.findOne({
                where: { _id: recap.sessionId },
                raw: true,
            }),
        ]);
        return view;
    }

    // ------------------------------------------------------------------
    // Mentor / mentee: dữ liệu của tôi
    // ------------------------------------------------------------------

    async getMyMentoring(user: User) {
        const member = await this.getMemberOfUser(user);
        const now = this.now();
        const pairs = await this.pairModel.findAll({
            where: {
                [Op.or]: [{ mentorId: member._id }, { menteeId: member._id }],
                status: { [Op.ne]: MentoringPairStatus.CANCELLED },
            },
            raw: true,
        });
        const quarters = pairs.length
            ? await this.quarterModel.findAll({
                  where: {
                      _id: [...new Set(pairs.map((pair) => pair.quarterId))],
                  },
                  raw: true,
              })
            : [];
        const visibleQuarterIds = new Set(
            quarters
                .filter((quarter) =>
                    isVisibleToMember(
                        { visibleAt: new Date(quarter.visibleAt) },
                        now,
                    ),
                )
                .map((quarter) => quarter._id),
        );
        const visiblePairs = pairs.filter((pair) =>
            visibleQuarterIds.has(pair.quarterId),
        );
        const sessions = visiblePairs.length
            ? await this.sessionModel.findAll({
                  where: { pairId: visiblePairs.map((pair) => pair._id) },
                  raw: true,
              })
            : [];
        const views = await this.buildSessionViews(sessions);
        const myRole = (view: SessionView) =>
            view.mentor?._id === member._id
                ? MentoringRole.MENTOR
                : MentoringRole.MENTEE;
        const sessionMap = new Map(
            sessions.map((session) => [session._id, session]),
        );
        const mySessions = views.map((view) => {
            const role = myRole(view);
            const raw = sessionMap.get(view._id);
            const quarter = quarters.find(
                (item) => item.code === view.quarterCode,
            );
            const ownRecap =
                role === MentoringRole.MENTOR
                    ? view.recaps.mentor
                    : view.recaps.mentee;
            return {
                ...view,
                myRole: role,
                canEditSchedule:
                    !quarter?.isLocked && canEditSchedule(raw, now),
                canWriteRecap:
                    !quarter?.isLocked && canWriteRecap(raw, ownRecap, now),
            } as MySessionView;
        });
        return {
            member: this.toMemberView(member),
            now,
            quarters: quarters
                .filter((quarter) => visibleQuarterIds.has(quarter._id))
                .map((quarter) => this.quarterView(quarter))
                .sort((a, b) => quarterIndex(b) - quarterIndex(a)),
            sessions: mySessions,
            preference:
                member.memberType === MemberType.MENTEE
                    ? await this.getMyPreferenceState(member)
                    : null,
        };
    }

    /** Nguyện vọng cho quý kế tiếp của mentee */
    private async getMyPreferenceState(member: Plain<Member>) {
        const now = this.now();
        const next = quarterFromIndex(quarterIndex(quarterOfDate(now)) + 1);
        const timeline = quarterTimeline(next);
        const quarter = await this.quarterModel.findOne({
            where: { code: quarterCode(next) },
            raw: true,
        });
        let mine = null;
        if (quarter) {
            const preference = await this.preferenceModel.findOne({
                where: { quarterId: quarter._id, menteeId: member._id },
                raw: true,
            });
            if (preference) {
                const items = await this.preferenceItemModel.findAll({
                    where: { preferenceId: preference._id },
                    order: [["priority", "ASC"]],
                    raw: true,
                });
                const mentors = await this.memberModel.findAll({
                    where: { _id: items.map((item) => item.mentorId) },
                    raw: true,
                });
                mine = {
                    mentorCodes: items.map(
                        (item) =>
                            mentors.find(
                                (mentor) => mentor._id === item.mentorId,
                            )?.memberCode,
                    ),
                    message: preference.message ?? null,
                    submittedAt: preference.submittedAt,
                };
            }
        }
        return {
            quarterCode: quarterCode(next),
            opensAt: timeline.preferenceOpenAt,
            closesAt: timeline.pairingOpenAt,
            canChoose: canChoosePreference(timeline, now),
            mine,
        };
    }

    async savePreference(dto: PreferenceDto, user: User) {
        const member = await this.getMemberOfUser(user);
        if (member.memberType !== MemberType.MENTEE) {
            throw ApiError.Forbidden("error-mentoring-preference-mentee-only");
        }
        const ref = parseQuarterCode(dto.quarterCode);
        if (!canChoosePreference(quarterTimeline(ref), this.now())) {
            throw ApiError.Conflict("error-mentoring-preference-closed", {
                code: quarterCode(ref),
            });
        }
        const mentors = [];
        for (const code of dto.mentorCodes) {
            mentors.push(await this.findMemberByCode(code, MemberType.MENTOR));
        }
        return this.sequelize.transaction(async (t) => {
            const quarter = await this.ensureQuarter(quarterCode(ref), user, t);
            const now = this.now();
            const existing = await this.preferenceModel.findOne({
                where: { quarterId: quarter._id, menteeId: member._id },
                transaction: t,
            });
            let preferenceId = existing?._id;
            if (existing) {
                await existing.update(
                    { message: dto.message ?? null, submittedAt: now },
                    { transaction: t },
                );
                await this.preferenceItemModel.destroy({
                    where: { preferenceId },
                    transaction: t,
                });
            } else {
                const created = await this.preferenceModel.create(
                    {
                        quarterId: quarter._id,
                        menteeId: member._id,
                        message: dto.message ?? null,
                        submittedAt: now,
                        isLateJoiner: false,
                    },
                    { transaction: t },
                );
                preferenceId = created._id;
            }
            await this.preferenceItemModel.bulkCreate(
                mentors.map((mentor, index) => ({
                    preferenceId,
                    mentorId: mentor._id,
                    priority: index + 1,
                })),
                { transaction: t },
            );
            return {
                quarterCode: quarter.code,
                mentorCodes: mentors.map((mentor) => mentor.memberCode),
                message: dto.message ?? null,
                submittedAt: now,
            };
        });
    }

    // ------------------------------------------------------------------
    // Báo cáo theo quý
    // ------------------------------------------------------------------

    /** Báo cáo của admin: mỗi cặp 2 dòng (Mentor, Mentee), mỗi tháng mã + trạng thái */
    async getQuarterReports() {
        const quarters = await this.quarterModel.findAll({
            order: [
                ["year", "ASC"],
                ["quarter", "ASC"],
            ],
            raw: true,
        });
        const reports = [];
        for (const quarter of quarters) {
            const { sessions } = await this.getQuarterBoard(quarter.code);
            reports.push(
                this.buildQuarterReport(this.quarterView(quarter), sessions),
            );
        }
        return reports;
    }

    async getQuarterReport(code: string) {
        const { quarter, sessions } = await this.getQuarterBoard(code);
        return this.buildQuarterReport(quarter, sessions);
    }

    private buildQuarterReport(
        quarter: ReturnType<MentoringFlowService["quarterView"]>,
        sessions: SessionView[],
    ) {
        const groups = new Map<string, SessionView[]>();
        for (const session of sessions) {
            const key = session.pair?.code ?? session.code;
            groups.set(key, [...(groups.get(key) ?? []), session]);
        }
        const rows = [...groups.entries()].flatMap(([code, items], index) =>
            (["MENTOR", "MENTEE"] as const).map((role) => {
                const member =
                    role === "MENTOR" ? items[0].mentor : items[0].mentee;
                return {
                    key: `${code}-${role}`,
                    serial: role === "MENTOR" ? index + 1 : null,
                    pairCode: code,
                    role,
                    member,
                    months: Object.fromEntries(
                        quarter.months.map((month) => {
                            const session = items.find(
                                (item) => item.month === month,
                            );
                            return [
                                month,
                                session
                                    ? {
                                          sessionId: session._id,
                                          code: session.code,
                                          status:
                                              role === "MENTOR"
                                                  ? session.recapStatus.mentor
                                                  : session.recapStatus.mentee,
                                          pairStatus: session.recapStatus.pair,
                                      }
                                    : null,
                            ];
                        }),
                    ),
                };
            }),
        );
        return {
            quarter: {
                code: quarter.code,
                year: quarter.year,
                quarter: quarter.quarter,
                months: quarter.months,
                hasEnded: quarter.hasEnded,
                isLocked: quarter.isLocked,
            },
            hasImportedStatus: sessions.some(
                (session) => session.recapStatus.source === "IMPORTED",
            ),
            rows,
        };
    }

    /** Báo cáo của chính mentor/mentee: các quý đã kết thúc hoặc đã có recap/dữ liệu cũ */
    async getMyReport(user: User) {
        const { member, sessions } = await this.getMyMentoring(user);
        const groups = new Map<string, MySessionView[]>();
        for (const session of sessions) {
            const key = session.pair?.code ?? session.code;
            groups.set(key, [...(groups.get(key) ?? []), session]);
        }
        const now = this.now();
        return [...groups.entries()]
            .map(([code, items]) => {
                const ref = parseQuarterCode(items[0].quarterCode);
                const months = quarterMonths(ref);
                const role = items[0].myRole;
                const hasEnded =
                    now >=
                    new Date(`${quarterDates(ref).endDate}T23:59:59.999+07:00`);
                const hasData = items.some(
                    (item) =>
                        item.recapStatus.source === "IMPORTED" ||
                        (role === "MENTOR"
                            ? item.recaps.mentor
                            : item.recaps.mentee),
                );
                return {
                    key: code,
                    pairCode: code,
                    quarterCode: items[0].quarterCode,
                    year: ref.year,
                    quarter: ref.quarter,
                    role,
                    me: member,
                    mentor: items[0].mentor,
                    mentee: items[0].mentee,
                    visible: hasEnded || hasData,
                    months: months.map((month) => {
                        const session = items.find(
                            (item) => item.month === month,
                        );
                        return {
                            month,
                            session: session
                                ? {
                                      _id: session._id,
                                      code: session.code,
                                      schedule: session.schedule,
                                      status:
                                          role === "MENTOR"
                                              ? session.recapStatus.mentor
                                              : session.recapStatus.mentee,
                                      recap:
                                          role === "MENTOR"
                                              ? session.recaps.mentor
                                              : session.recaps.mentee,
                                  }
                                : null,
                        };
                    }),
                };
            })
            .filter((report) => report.visible)
            .sort((a, b) => a.year - b.year || a.quarter - b.quarter);
    }
}

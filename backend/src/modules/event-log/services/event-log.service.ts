import { BaseService } from "@config/service/base.service";
import { ApiError } from "@config/exception/api-error";
import { Entity } from "@module/repository";
import { InjectRepository } from "@module/repository/common/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { EventLog } from "../entities/event-log.entity";
import { EventLogRepository } from "../repository/event-log-repository.interface";
import { CreateEventLogDto } from "../dto/create-event-log.dto";
import { UpdateEventLogDto } from "../dto/update-event-log.dto";
import { CommonQueryDto } from "@common/dto/common-query.dto";
import { User } from "@module/user/entities/user.entity";

@Injectable()
export class EventLogService extends BaseService<EventLog, EventLogRepository> {
    constructor(
        @InjectRepository(Entity.EVENT_LOG)
        private readonly eventLogRepository: EventLogRepository,
        @InjectTransaction()
        private readonly eventLogTransaction: BaseTransaction,
    ) {
        super(eventLogRepository, {
            notFoundCode: "error-event-log-not-found",
            transaction: eventLogTransaction,
        });
    }

    /**
     * Tạo mới EventLog
     */
    async createEventLog(
        dto: CreateEventLogDto,
        user: User,
    ): Promise<EventLog> {
        // Kiểm tra identity code đã tồn tại chưa
        if (dto.identityCode) {
            const existingByIdentityCode =
                await this.eventLogRepository.findByIdentityCode(
                    dto.identityCode,
                );
            if (existingByIdentityCode) {
                throw ApiError.BadRequest(
                    "error-event-log-identity-code-exist",
                );
            }
        }

        const eventLogData = {
            eventId: dto.eventId,
            identityCode: dto.identityCode,
            name: dto.name,
            gender: dto.gender,
            isCheckedIn: dto.isCheckedIn || false,
            isCheckedOut: dto.isCheckedOut || false,
            checkInTime: dto.checkInTime,
            checkOutTime: null,
        };

        return await this.create(user, eventLogData, {});
    }

    /**
     * Lấy tất cả EventLog với điều kiện
     */
    async findAll(
        conditions: any = {},
        commonQuery: CommonQueryDto<EventLog>,
    ): Promise<EventLog[]> {
        return await this.eventLogRepository.findAll(conditions, commonQuery);
    }

    /**
     * Tìm EventLog theo ID
     */
    async findByIdCustom(id: string, user?: User): Promise<EventLog> {
        return await this.getById(user || null, id, {});
    }

    /**
     * Cập nhật EventLog
     */
    async updateEventLog(
        id: string,
        dto: UpdateEventLogDto,
        user: User,
    ): Promise<EventLog> {
        const eventLog = await this.getById(user, id, {});

        // Kiểm tra identity code nếu có thay đổi
        if (dto.identityCode && dto.identityCode !== eventLog.identityCode) {
            const existingByIdentityCode =
                await this.eventLogRepository.findByIdentityCode(
                    dto.identityCode,
                );
            if (existingByIdentityCode) {
                throw ApiError.BadRequest(
                    "error-event-log-identity-code-exist",
                );
            }
        }

        const updateData = {
            eventId: dto.eventId || eventLog.eventId,
            identityCode: dto.identityCode || eventLog.identityCode,
            name: dto.name || eventLog.name,
            gender: dto.gender || eventLog.gender,
            isCheckedIn:
                dto.isCheckedIn !== undefined
                    ? dto.isCheckedIn
                    : eventLog.isCheckedIn,
            isCheckedOut:
                dto.isCheckedOut !== undefined
                    ? dto.isCheckedOut
                    : eventLog.isCheckedOut,
            checkInTime: dto.checkInTime || eventLog.checkInTime,
        };

        return await this.updateById(user, id, updateData, {});
    }

    /**
     * Xóa EventLog theo ID
     */
    async deleteEventLogById(id: string, user: User): Promise<EventLog> {
        return await this.deleteById(user, id, {});
    }

    /**
     * Check-in người dùng
     */
    async checkInUser(id: string, user?: User): Promise<EventLog> {
        const eventLog = await this.getById(user || null, id, {});

        if (eventLog.isCheckedIn) {
            throw ApiError.BadRequest("error-event-log-already-checked-in");
        }

        return await this.eventLogRepository.checkInUser(id);
    }

    /**
     * Check-out người dùng
     */
    async checkOutUser(id: string, user?: User): Promise<EventLog> {
        const eventLog = await this.getById(user || null, id, {});

        if (!eventLog.isCheckedIn) {
            throw ApiError.BadRequest("error-event-log-not-found");
        }

        if (eventLog.isCheckedOut) {
            throw ApiError.BadRequest("error-event-log-already-checked-out");
        }

        return await this.eventLogRepository.checkOutUser(id);
    }

    /**
     * Lấy danh sách EventLog theo eventId
     */
    async findByEventId(eventId: string): Promise<EventLog[]> {
        return await this.eventLogRepository.findByEventId(eventId);
    }

    /**
     * Tìm EventLog theo identity code
     */
    async findByIdentityCode(identityCode: string): Promise<EventLog | null> {
        return await this.eventLogRepository.findByIdentityCode(identityCode);
    }

    /**
     * Kiểm tra EventLog có tồn tại theo identity code
     */
    async checkEventLogExistsByIdentityCode(
        identityCode: string,
    ): Promise<boolean> {
        const eventLog =
            await this.eventLogRepository.findByIdentityCode(identityCode);
        return !!eventLog;
    }

    /**
     * Thống kê số lượng người đã check-in/check-out cho một sự kiện
     */
    async getEventStatistics(eventId: string): Promise<{
        total: number;
        checkedIn: number;
        checkedOut: number;
        notCheckedIn: number;
        currentlyInside: number;
    }> {
        const eventLogs = await this.findByEventId(eventId);

        const total = eventLogs.length;
        const checkedIn = eventLogs.filter((log) => log.isCheckedIn).length;
        const checkedOut = eventLogs.filter((log) => log.isCheckedOut).length;
        const notCheckedIn = total - checkedIn;
        const currentlyInside = eventLogs.filter(
            (log) => log.isCheckedIn && !log.isCheckedOut,
        ).length;

        return {
            total,
            checkedIn,
            checkedOut,
            notCheckedIn,
            currentlyInside,
        };
    }

    /**
     * Xử lý check-in/check-out tự động dựa trên trạng thái hiện tại
     */
    async processCheckInOut(
        dto: CreateEventLogDto,
        user: User,
    ): Promise<{
        eventLog: EventLog;
        action: string;
        message: string;
    }> {
        const existingRecord = await this.eventLogRepository.findByIdentityCode(
            dto.identityCode,
        );

        if (!existingRecord) {
            // Lần đầu tiên - thực hiện check-in
            const eventLogData = {
                eventId: dto.eventId,
                identityCode: dto.identityCode,
                name: dto.name,
                gender: dto.gender,
                isCheckedIn: true,
                isCheckedOut: false,
                checkInTime: new Date().toISOString(),
                checkOutTime: null,
            };

            const newEventLog = await this.create(user, eventLogData, {});

            return {
                eventLog: newEventLog,
                action: "checked_in",
                message: "Đã check-in thành công",
            };
        } else {
            if (existingRecord.isCheckedIn && !existingRecord.isCheckedOut) {
                // Đã check-in nhưng chưa check-out - thực hiện check-out
                const updatedEventLog =
                    await this.eventLogRepository.checkOutUser(
                        existingRecord._id,
                    );

                return {
                    eventLog: updatedEventLog,
                    action: "checked_out",
                    message: "Đã check-out thành công",
                };
            } else if (
                existingRecord.isCheckedIn &&
                existingRecord.isCheckedOut
            ) {
                return {
                    eventLog: existingRecord,
                    action: "already_processed",
                    message: "Đã hoàn thành check-in và check-out",
                };
            } else {
                return {
                    eventLog: existingRecord,
                    action: "unknown_state",
                    message: "Trạng thái không xác định",
                };
            }
        }
    }

    /**
     * Lấy danh sách người hiện đang ở trong sự kiện
     */
    async getCurrentlyInside(eventId?: string): Promise<EventLog[]> {
        if (eventId) {
            const eventLogs = await this.findByEventId(eventId);
            return eventLogs.filter(
                (log) => log.isCheckedIn && !log.isCheckedOut,
            );
        } else {
            // Lấy tất cả EventLog với điều kiện đang ở trong
            return await this.eventLogRepository.findAll(
                { isCheckedIn: true, isCheckedOut: false },
                {},
            );
        }
    }

    /**
     * Tìm kiếm EventLog theo nhiều tiêu chí
     */
    async searchEventLogs(
        criteria: {
            searchTerm?: string;
            identityCode?: string;
            name?: string;
            eventId?: string;
            gender?: string;
            isCheckedIn?: boolean;
            isCheckedOut?: boolean;
        },
        commonQuery: CommonQueryDto<EventLog>,
    ): Promise<EventLog[]> {
        const conditions: any = {};

        if (criteria.eventId) {
            conditions.eventId = criteria.eventId;
        }

        if (criteria.identityCode) {
            conditions.identityCode = criteria.identityCode;
        }

        if (criteria.name) {
            // Tìm kiếm gần đúng theo tên
            conditions.name = criteria.name;
        }

        if (criteria.gender) {
            conditions.gender = criteria.gender;
        }

        if (criteria.isCheckedIn !== undefined) {
            conditions.isCheckedIn = criteria.isCheckedIn;
        }

        if (criteria.isCheckedOut !== undefined) {
            conditions.isCheckedOut = criteria.isCheckedOut;
        }

        return await this.eventLogRepository.findAll(conditions, commonQuery);
    }

    /**
     * Lấy danh sách check-in gần đây
     */
    async getRecentCheckIns(
        eventId?: string,
        limit: number = 10,
    ): Promise<EventLog[]> {
        const conditions: any = { isCheckedIn: true };

        if (eventId) {
            conditions.eventId = eventId;
        }

        const commonQuery: CommonQueryDto<EventLog> = {
            sort: { checkInTime: -1 },
            limit,
        };

        return await this.eventLogRepository.findAll(conditions, commonQuery);
    }

    /**
     * Lấy danh sách check-out gần đây
     */
    async getRecentCheckOuts(
        eventId?: string,
        limit: number = 10,
    ): Promise<EventLog[]> {
        const conditions: any = { isCheckedOut: true };

        if (eventId) {
            conditions.eventId = eventId;
        }

        const commonQuery: CommonQueryDto<EventLog> = {
            sort: { checkOutTime: -1 },
            limit,
        };

        return await this.eventLogRepository.findAll(conditions, commonQuery);
    }

    /**
     * Thống kê theo giới tính
     */
    async getStatsByGender(eventId?: string): Promise<{
        male: number;
        female: number;
        unknown: number;
        other: Record<string, number>;
    }> {
        const conditions: any = {};

        if (eventId) {
            conditions.eventId = eventId;
        }

        const eventLogs = await this.eventLogRepository.findAll(conditions, {});

        const stats = {
            male: 0,
            female: 0,
            unknown: 0,
            other: {} as Record<string, number>,
        };

        eventLogs.forEach((log) => {
            if (!log.gender) {
                stats.unknown++;
            } else if (
                log.gender.toLowerCase() === "nam" ||
                log.gender.toLowerCase() === "male"
            ) {
                stats.male++;
            } else if (
                log.gender.toLowerCase() === "nữ" ||
                log.gender.toLowerCase() === "nu" ||
                log.gender.toLowerCase() === "female"
            ) {
                stats.female++;
            } else {
                stats.other[log.gender] = (stats.other[log.gender] || 0) + 1;
            }
        });

        return stats;
    }
}

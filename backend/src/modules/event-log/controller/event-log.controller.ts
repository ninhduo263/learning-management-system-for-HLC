import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    HttpStatus,
    UseGuards,
} from "@nestjs/common";
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiQuery,
    ApiParam,
} from "@nestjs/swagger";
import { EventLogService } from "../services/event-log.service";
import { CreateEventLogDto } from "../dto/create-event-log.dto";
import { UpdateEventLogDto } from "../dto/update-event-log.dto";
import { CommonQueryDto } from "@common/dto/common-query.dto";
import { User } from "@module/user/entities/user.entity";
import { ReqUser } from "@common/decorator/auth.decorator";
import { EventLog } from "../entities/event-log.entity";

// Response wrapper interface
interface ApiResponseWrapper<T> {
    success: boolean;
    payload: T;
}

@ApiTags("Event Logs")
@Controller("event-logs")
export class EventLogController {
    constructor(private readonly eventLogService: EventLogService) {}

    @Post("checkin-checkout")
    @ApiOperation({ summary: "Xử lý check-in/check-out tự động" })
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Check-in/Check-out thành công",
    })
    async checkInOut(
        @Body() createEventLogDto: CreateEventLogDto,
        @ReqUser() user: User,
    ): Promise<ApiResponseWrapper<any>> {
        try {
            const result = await this.eventLogService.processCheckInOut(
                createEventLogDto,
                user,
            );

            const responseData = {
                identityCode: result.eventLog.identityCode,
                name: result.eventLog.name,
                gender: result.eventLog.gender,
                isCheckedIn: result.eventLog.isCheckedIn,
                isCheckedOut: result.eventLog.isCheckedOut,
                eventId: result.eventLog.eventId,
                status: result.action,
                message: result.message,
                checkInTime: result.eventLog.checkInTime,
                checkOutTime: result.eventLog.checkOutTime,
            };

            return {
                success: true,
                payload: responseData,
            };
        } catch (error) {
            return {
                success: false,
                payload: {
                    status: "error",
                    message: "Check-in/Check-out failed",
                    error: error.message,
                },
            };
        }
    }

    @Get("records")
    @ApiOperation({ summary: "Lấy tất cả bản ghi tham dự" })
    @ApiQuery({
        name: "skip",
        required: false,
        type: Number,
        description: "Bỏ qua số bản ghi",
    })
    @ApiQuery({
        name: "limit",
        required: false,
        type: Number,
        description: "Giới hạn số bản ghi",
    })
    @ApiQuery({
        name: "eventId",
        required: true,
        type: String,
        description: "ID của sự kiện",
    })
    async getAllRecords(
        @Query("skip") skip: number = 0,
        @Query("limit") limit: number = 100,
        @Query("eventId") eventId: string,
    ): Promise<ApiResponseWrapper<EventLog[]>> {
        const commonQuery: CommonQueryDto<EventLog> = {
            skip,
            limit,
        };

        const records = await this.eventLogService.findByEventId(eventId);

        return {
            success: true,
            payload: records,
        };
    }

    @Get("search")
    @ApiOperation({ summary: "Tìm kiếm bản ghi theo nhiều tiêu chí" })
    @ApiQuery({
        name: "searchTerm",
        required: false,
        type: String,
        description: "Tìm kiếm chung",
    })
    @ApiQuery({
        name: "identityCode",
        required: false,
        type: String,
        description: "Tìm kiếm theo CCCD",
    })
    @ApiQuery({
        name: "name",
        required: false,
        type: String,
        description: "Tìm kiếm theo tên",
    })
    @ApiQuery({
        name: "eventId",
        required: true,
        type: String,
        description: "ID của sự kiện",
    })
    @ApiQuery({
        name: "skip",
        required: false,
        type: Number,
        description: "Bỏ qua số bản ghi",
    })
    @ApiQuery({
        name: "limit",
        required: false,
        type: Number,
        description: "Giới hạn số bản ghi",
    })
    async searchRecords(
        @Query("searchTerm") searchTerm?: string,
        @Query("identityCode") identityCode?: string,
        @Query("name") name?: string,
        @Query("eventId") eventId?: string,
        @Query("skip") skip: number = 0,
        @Query("limit") limit: number = 100,
    ): Promise<
        ApiResponseWrapper<{
            records: EventLog[];
            total: number;
            skip: number;
            limit: number;
        }>
    > {
        const commonQuery: CommonQueryDto<EventLog> = {
            skip,
            limit,
        };

        const criteria = {
            searchTerm,
            identityCode,
            name,
            eventId,
        };

        const records = await this.eventLogService.searchEventLogs(
            criteria,
            commonQuery,
        );

        return {
            success: true,
            payload: {
                records,
                total: records.length,
                skip,
                limit,
            },
        };
    }

    @Get("search/by-cccd")
    @ApiOperation({ summary: "Tìm kiếm theo CCCD/CMND" })
    @ApiQuery({
        name: "cccd",
        required: true,
        type: String,
        description: "CCCD/CMND để tìm kiếm",
    })
    @ApiQuery({
        name: "eventId",
        required: true,
        type: String,
        description: "ID của sự kiện",
    })
    async searchByCccd(
        @Query("cccd") cccd: string,
        @Query("eventId") eventId: string,
    ): Promise<ApiResponseWrapper<EventLog[]>> {
        const criteria = {
            identityCode: cccd,
            eventId,
        };

        const records = await this.eventLogService.searchEventLogs(
            criteria,
            {},
        );

        return {
            success: true,
            payload: records,
        };
    }

    @Get("search/by-name")
    @ApiOperation({ summary: "Tìm kiếm theo tên" })
    @ApiQuery({
        name: "name",
        required: true,
        type: String,
        description: "Tên để tìm kiếm",
    })
    @ApiQuery({
        name: "eventId",
        required: true,
        type: String,
        description: "ID của sự kiện",
    })
    @ApiQuery({
        name: "skip",
        required: false,
        type: Number,
        description: "Bỏ qua số bản ghi",
    })
    @ApiQuery({
        name: "limit",
        required: false,
        type: Number,
        description: "Giới hạn số bản ghi",
    })
    async searchByName(
        @Query("name") name: string,
        @Query("eventId") eventId: string,
        @Query("skip") skip: number = 0,
        @Query("limit") limit: number = 100,
    ): Promise<ApiResponseWrapper<EventLog[]>> {
        const commonQuery: CommonQueryDto<EventLog> = {
            skip,
            limit,
        };

        const criteria = {
            name,
            eventId,
        };

        const records = await this.eventLogService.searchEventLogs(
            criteria,
            commonQuery,
        );

        return {
            success: true,
            payload: records,
        };
    }

    @Get("records/export")
    @ApiOperation({ summary: "Xuất tất cả bản ghi tham dự ra Excel" })
    @ApiQuery({
        name: "eventId",
        required: true,
        type: String,
        description: "ID của sự kiện",
    })
    async exportRecords(
        @Query("eventId") eventId: string,
    ): Promise<ApiResponseWrapper<{ url?: string; error?: string }>> {
        try {
            // Note: Trong NestJS, việc export Excel cần implement riêng
            // Ở đây trả về thông báo tạm thời
            const records = await this.eventLogService.findByEventId(eventId);

            return {
                success: true,
                payload: {
                    url: `export/event-${eventId}-records.xlsx`, // URL tạm thời
                },
            };
        } catch (error) {
            return {
                success: false,
                payload: {
                    error: error.message,
                },
            };
        }
    }

    @Get("records/:identityCode")
    @ApiOperation({ summary: "Lấy bản ghi theo identity code" })
    @ApiParam({
        name: "identityCode",
        type: String,
        description: "Identity code của người",
    })
    @ApiQuery({
        name: "eventId",
        required: true,
        type: String,
        description: "ID của sự kiện",
    })
    async getRecordByIdentityCode(
        @Param("identityCode") identityCode: string,
        @Query("eventId") eventId: string,
    ): Promise<ApiResponseWrapper<EventLog>> {
        const record =
            await this.eventLogService.findByIdentityCode(identityCode);

        return {
            success: true,
            payload: record,
        };
    }

    @Post("records")
    @ApiOperation({ summary: "Tạo mới bản ghi thủ công" })
    async createRecord(
        @Body() createEventLogDto: CreateEventLogDto,
        @ReqUser() user: User,
    ): Promise<ApiResponseWrapper<EventLog>> {
        const result = await this.eventLogService.createEventLog(
            createEventLogDto,
            user,
        );

        return {
            success: true,
            payload: result,
        };
    }

    @Put("records/:identityCode")
    @ApiOperation({ summary: "Cập nhật bản ghi" })
    @ApiParam({
        name: "identityCode",
        type: String,
        description: "Identity code của người",
    })
    async updateRecord(
        @Param("identityCode") identityCode: string,
        @Body() updateEventLogDto: UpdateEventLogDto,
        @ReqUser() user: User,
    ): Promise<ApiResponseWrapper<EventLog>> {
        // Tìm record theo identityCode trước
        const existingRecord =
            await this.eventLogService.findByIdentityCode(identityCode);

        const result = await this.eventLogService.updateEventLog(
            existingRecord._id,
            updateEventLogDto,
            user,
        );

        return {
            success: true,
            payload: result,
        };
    }

    @Put("records/:identityCode/check-in")
    @ApiOperation({ summary: "Check-in thủ công" })
    @ApiParam({
        name: "identityCode",
        type: String,
        description: "Identity code của người",
    })
    @ApiQuery({
        name: "eventId",
        required: true,
        type: String,
        description: "ID của sự kiện",
    })
    async manualCheckIn(
        @Param("identityCode") identityCode: string,
        @Query("eventId") eventId: string,
        @ReqUser() user: User,
    ): Promise<ApiResponseWrapper<EventLog>> {
        const existingRecord =
            await this.eventLogService.findByIdentityCode(identityCode);
        const result = await this.eventLogService.checkInUser(
            existingRecord._id,
            user,
        );

        return {
            success: true,
            payload: result,
        };
    }

    @Put("records/:identityCode/check-out")
    @ApiOperation({ summary: "Check-out thủ công" })
    @ApiParam({
        name: "identityCode",
        type: String,
        description: "Identity code của người",
    })
    @ApiQuery({
        name: "eventId",
        required: true,
        type: String,
        description: "ID của sự kiện",
    })
    async manualCheckOut(
        @Param("identityCode") identityCode: string,
        @Query("eventId") eventId: string,
        @ReqUser() user: User,
    ): Promise<ApiResponseWrapper<EventLog>> {
        const existingRecord =
            await this.eventLogService.findByIdentityCode(identityCode);
        const result = await this.eventLogService.checkOutUser(
            existingRecord._id,
            user,
        );

        return {
            success: true,
            payload: result,
        };
    }

    @Delete("records/:identityCode")
    @ApiOperation({ summary: "Xóa bản ghi" })
    @ApiParam({
        name: "identityCode",
        type: String,
        description: "Identity code của người",
    })
    @ApiQuery({
        name: "eventId",
        required: true,
        type: String,
        description: "ID của sự kiện",
    })
    async deleteRecord(
        @Param("identityCode") identityCode: string,
        @Query("eventId") eventId: string,
        @ReqUser() user: User,
    ): Promise<ApiResponseWrapper<boolean>> {
        const existingRecord =
            await this.eventLogService.findByIdentityCode(identityCode);
        await this.eventLogService.deleteEventLogById(existingRecord._id, user);

        return {
            success: true,
            payload: true,
        };
    }

    @Get("recent-checkins")
    @ApiOperation({ summary: "Lấy danh sách người check-in gần đây nhất" })
    @ApiQuery({
        name: "limit",
        required: false,
        type: Number,
        description: "Số lượng record cần lấy",
    })
    @ApiQuery({
        name: "eventId",
        required: true,
        type: String,
        description: "ID của sự kiện",
    })
    async getRecentCheckins(
        @Query("limit") limit: number = 10,
        @Query("eventId") eventId: string,
    ): Promise<ApiResponseWrapper<EventLog[]>> {
        const records = await this.eventLogService.getRecentCheckIns(
            eventId,
            limit,
        );

        return {
            success: true,
            payload: records,
        };
    }

    @Get("recent-checkouts")
    @ApiOperation({ summary: "Lấy danh sách người check-out gần đây nhất" })
    @ApiQuery({
        name: "limit",
        required: false,
        type: Number,
        description: "Số lượng record cần lấy",
    })
    @ApiQuery({
        name: "eventId",
        required: true,
        type: String,
        description: "ID của sự kiện",
    })
    async getRecentCheckouts(
        @Query("limit") limit: number = 10,
        @Query("eventId") eventId: string,
    ): Promise<ApiResponseWrapper<EventLog[]>> {
        const records = await this.eventLogService.getRecentCheckOuts(
            eventId,
            limit,
        );

        return {
            success: true,
            payload: records,
        };
    }

    @Get("total-stats")
    @ApiOperation({ summary: "Lấy tổng số lượng thống kê" })
    @ApiQuery({
        name: "eventId",
        required: true,
        type: String,
        description: "ID của sự kiện",
    })
    async getTotalStats(@Query("eventId") eventId: string): Promise<
        ApiResponseWrapper<{
            total: number;
            checkedIn: number;
            checkedOut: number;
            notCheckedIn: number;
            currentlyInside: number;
        }>
    > {
        const stats = await this.eventLogService.getEventStatistics(eventId);

        return {
            success: true,
            payload: stats,
        };
    }

    @Get("event-stats")
    @ApiOperation({ summary: "Thống kê theo từng sự kiện" })
    async getEventStats(): Promise<ApiResponseWrapper<any>> {
        // Note: Cần implement logic thống kê theo từng sự kiện
        return {
            success: true,
            payload: {
                message: "Event stats endpoint - cần implement",
            },
        };
    }

    @Get("period-stats")
    @ApiOperation({ summary: "Lấy thống kê theo thời gian" })
    @ApiQuery({
        name: "days",
        required: false,
        type: Number,
        description: "Số ngày cần thống kê",
    })
    @ApiQuery({
        name: "eventId",
        required: true,
        type: String,
        description: "ID của sự kiện",
    })
    async getStatsByPeriod(
        @Query("days") days: number = 7,
        @Query("eventId") eventId: string,
    ): Promise<ApiResponseWrapper<any[]>> {
        // Note: Cần implement logic thống kê theo thời gian
        return {
            success: true,
            payload: [],
        };
    }

    @Get("gender-stats")
    @ApiOperation({ summary: "Thống kê theo giới tính" })
    @ApiQuery({
        name: "eventId",
        required: true,
        type: String,
        description: "ID của sự kiện",
    })
    async getStatsByGender(@Query("eventId") eventId: string): Promise<
        ApiResponseWrapper<{
            male: number;
            female: number;
            unknown: number;
            other: Record<string, number>;
        }>
    > {
        const stats = await this.eventLogService.getStatsByGender(eventId);

        return {
            success: true,
            payload: stats,
        };
    }

    @Get("currently-inside")
    @ApiOperation({ summary: "Lấy danh sách người hiện đang ở trong" })
    @ApiQuery({
        name: "eventId",
        required: true,
        type: String,
        description: "ID của sự kiện",
    })
    async getCurrentlyInside(
        @Query("eventId") eventId: string,
    ): Promise<ApiResponseWrapper<EventLog[]>> {
        const records = await this.eventLogService.getCurrentlyInside(eventId);

        return {
            success: true,
            payload: records,
        };
    }

    @Get("average-duration")
    @ApiOperation({
        summary: "Tính thời gian trung bình người tham gia ở lại sự kiện",
    })
    @ApiQuery({
        name: "eventId",
        required: true,
        type: String,
        description: "ID của sự kiện",
    })
    async getAvgDuration(
        @Query("eventId") eventId: string,
    ): Promise<ApiResponseWrapper<any>> {
        // Note: Cần implement logic tính thời gian trung bình
        return {
            success: true,
            payload: {
                message: "Average duration endpoint - cần implement",
            },
        };
    }

    @Get("active-hours")
    @ApiOperation({ summary: "Phân tích giờ cao điểm của sự kiện" })
    @ApiQuery({
        name: "eventId",
        required: true,
        type: String,
        description: "ID của sự kiện",
    })
    async getActiveHours(
        @Query("eventId") eventId: string,
    ): Promise<ApiResponseWrapper<any[]>> {
        // Note: Cần implement logic phân tích giờ cao điểm
        return {
            success: true,
            payload: [],
        };
    }

    @Get("dashboard")
    @ApiOperation({ summary: "Lấy tổng hợp thống kê cho dashboard" })
    @ApiQuery({
        name: "eventId",
        required: true,
        type: String,
        description: "ID của sự kiện",
    })
    async getDashboardStats(@Query("eventId") eventId: string): Promise<
        ApiResponseWrapper<{
            total_stats: any;
            recent_checkins: EventLog[];
            recent_checkouts: EventLog[];
            gender_stats: any;
            avg_duration?: any;
            period_stats?: any[];
        }>
    > {
        // Lấy các thống kê cơ bản
        const totalStats =
            await this.eventLogService.getEventStatistics(eventId);

        // Lấy 5 người check-in gần đây nhất
        const recentCheckins = await this.eventLogService.getRecentCheckIns(
            eventId,
            5,
        );

        // Lấy 5 người check-out gần đây nhất
        const recentCheckouts = await this.eventLogService.getRecentCheckOuts(
            eventId,
            5,
        );

        // Thống kê theo giới tính
        const genderStats =
            await this.eventLogService.getStatsByGender(eventId);

        // Tổng hợp dữ liệu
        const dashboardData = {
            total_stats: totalStats,
            recent_checkins: recentCheckins,
            recent_checkouts: recentCheckouts,
            gender_stats: genderStats,
        };

        return {
            success: true,
            payload: dashboardData,
        };
    }
}

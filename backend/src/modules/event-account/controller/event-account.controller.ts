import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Authorization, ReqUser } from "@common/decorator/auth.decorator";
import { User } from "@module/user/entities/user.entity";
import { EventAccountService } from "../services/event-account.service";
import { CreateEventAccountDto } from "../dto/create-event-account.dto";
import { UpdateEventAccountDto } from "../dto/update-event-account.dto";
import { EventAccountQueryDto } from "../dto/event-account-query.dto";
import { CommonQueryDto } from "@common/dto/common-query.dto";
import { EventAccount } from "../entities/event-account.entity";

@ApiTags("Event Accounts")
@Controller("event-accounts")
export class EventAccountController {
    constructor(private readonly eventAccountService: EventAccountService) {}

    @Post("/accounts")
    @ApiOperation({ summary: "Tạo tài khoản sự kiện mới" })
    @ApiResponse({ status: 201, description: "Tài khoản được tạo thành công" })
    @ApiResponse({ status: 400, description: "Dữ liệu không hợp lệ" })
    async create(
        @ReqUser() user: User,
        @Body() createEventAccountDto: CreateEventAccountDto,
    ) {
        return this.eventAccountService.createEventAccount(
            createEventAccountDto,
        );
    }

    @Get("/accounts")
    @ApiOperation({ summary: "Lấy danh sách tài khoản sự kiện" })
    @ApiResponse({ status: 200, description: "Danh sách tài khoản" })
    async findAll(@ReqUser() user: User, @Query() query: EventAccountQueryDto) {
        const conditions: any = {};

        const commonQuery: CommonQueryDto<EventAccount> = {
            filters: [],
            population: [],
        };

        // Chỉ thêm các field có giá trị
        if (query.select) commonQuery.select = query.select as any;
        if (query.sort) commonQuery.sort = query.sort as any;
        if (query.page) commonQuery.page = parseInt(query.page);
        if (query.limit) commonQuery.limit = parseInt(query.limit);
        if (query.skip) commonQuery.skip = parseInt(query.skip);

        return this.eventAccountService.getPage(user, conditions, commonQuery);
    }

    @Get(":id")
    @ApiOperation({ summary: "Lấy thông tin tài khoản theo ID" })
    @ApiResponse({ status: 200, description: "Thông tin tài khoản" })
    @ApiResponse({ status: 404, description: "Không tìm thấy tài khoản" })
    async findOne(@ReqUser() user: User, @Param("id") id: string) {
        return this.eventAccountService.getById(user, id);
    }

    @Get("username/:username")
    @ApiOperation({ summary: "Lấy thông tin tài khoản theo username" })
    @ApiResponse({ status: 200, description: "Thông tin tài khoản" })
    @ApiResponse({ status: 404, description: "Không tìm thấy tài khoản" })
    async findByUsername(@Param("username") username: string) {
        return this.eventAccountService.findByUsername(username);
    }

    @Patch(":id")
    @ApiOperation({ summary: "Cập nhật tài khoản sự kiện" })
    @ApiResponse({
        status: 200,
        description: "Tài khoản được cập nhật thành công",
    })
    @ApiResponse({ status: 404, description: "Không tìm thấy tài khoản" })
    async update(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() updateEventAccountDto: UpdateEventAccountDto,
    ) {
        return this.eventAccountService.updateEventAccount(
            id,
            updateEventAccountDto,
        );
    }

    @Delete(":id")
    @ApiOperation({ summary: "Xóa tài khoản sự kiện" })
    @ApiResponse({ status: 200, description: "Tài khoản được xóa thành công" })
    @ApiResponse({ status: 404, description: "Không tìm thấy tài khoản" })
    async remove(@ReqUser() user: User, @Param("id") id: string) {
        return this.eventAccountService.deleteById(user, id);
    }

    @Post("/login")
    @ApiOperation({ summary: "Xác thực mật khẩu" })
    @ApiResponse({ status: 200, description: "Xác thực thành công" })
    @ApiResponse({ status: 401, description: "Xác thực thất bại" })
    async validatePassword(
        @Body() dto: { username: string; password: string },
    ) {
        return this.eventAccountService.validatePassword(
            dto.username,
            dto.password,
        );
    }
}

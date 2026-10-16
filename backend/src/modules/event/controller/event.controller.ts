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
import { EventService } from "../services/event.service";
import { CreateEventDto } from "../dto/create-event.dto";
import { UpdateEventDto } from "../dto/update-event.dto";
import { Event } from "../entities/event.entity";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { CommonQueryDto } from "@common/dto/common-query.dto";

@ApiTags("Event")
@Controller("events")
export class EventController {
    constructor(private readonly eventService: EventService) {}

    @Post("/create")
    @ApiOperation({ summary: "Tạo sự kiện mới" })
    @ApiResponse({ status: 201, description: "Sự kiện được tạo thành công" })
    @ApiResponse({ status: 400, description: "Dữ liệu không hợp lệ" })
    async create(@Body() createEventDto: CreateEventDto) {
        return this.eventService.createEvent(createEventDto);
    }

    @Get("/get-all")
    @ApiOperation({ summary: "Lấy danh sách sự kiện" })
    @ApiResponse({ status: 200, description: "Danh sách sự kiện" })
    async findAll(@Query() query: CommonQueryDto<Event>) {
        return this.eventService.findAll({}, query);
    }

    @Get("/:id")
    @ApiOperation({ summary: "Lấy thông tin sự kiện theo ID" })
    @ApiParam({ name: "id", description: "ID của sự kiện" })
    @ApiResponse({ status: 200, description: "Thông tin sự kiện" })
    @ApiResponse({ status: 404, description: "Không tìm thấy sự kiện" })
    async findById(@Param("id") id: string) {
        return this.eventService.findByIdCustom(id);
    }

    @Patch("/:id")
    @ApiOperation({ summary: "Cập nhật thông tin sự kiện" })
    @ApiParam({ name: "id", description: "ID của sự kiện" })
    @ApiResponse({
        status: 200,
        description: "Sự kiện được cập nhật thành công",
    })
    @ApiResponse({ status: 404, description: "Không tìm thấy sự kiện" })
    @ApiResponse({ status: 400, description: "Dữ liệu không hợp lệ" })
    async update(
        @Param("id") id: string,
        @Body() updateEventDto: UpdateEventDto,
    ) {
        return this.eventService.updateEvent(id, updateEventDto);
    }

    @Delete("/:id")
    @ApiOperation({ summary: "Xóa sự kiện" })
    @ApiParam({ name: "id", description: "ID của sự kiện" })
    @ApiResponse({ status: 200, description: "Sự kiện được xóa thành công" })
    @ApiResponse({ status: 404, description: "Không tìm thấy sự kiện" })
    async delete(@Param("id") id: string) {
        return this.eventService.deleteEventById(id);
    }

    @Get("/:id/event-logs")
    @ApiOperation({ summary: "Lấy danh sách event logs của sự kiện" })
    @ApiParam({ name: "id", description: "ID của sự kiện" })
    @ApiResponse({ status: 200, description: "Danh sách event logs" })
    @ApiResponse({ status: 404, description: "Không tìm thấy sự kiện" })
    async getEventLogs(@Param("id") id: string) {
        return this.eventService.getEventWithLogs(id);
    }
}

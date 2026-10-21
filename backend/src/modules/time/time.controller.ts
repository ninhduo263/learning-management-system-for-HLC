import {
    AllowSystemRoles,
    Authorization,
} from "@common/decorator/auth.decorator";
import { SystemRole } from "@module/user/common/constant";
import { Body, Controller, Get, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SetMockDateDto } from "./dto/set-mock-date.dto";
import { TimeService } from "./time.service";

@Controller("time")
@ApiTags("time")
@Authorization()
export class TimeController {
    constructor(private readonly timeService: TimeService) {}

    @Get("mock")
    getMockDate() {
        return {
            ...this.timeService.getMockDateState(),
            now: this.timeService.now(),
        };
    }

    @Put("mock")
    @AllowSystemRoles(SystemRole.ADMIN)
    setMockDate(@Body() dto: SetMockDateDto) {
        this.timeService.setMockDate(dto.date ?? null);
        return {
            ...this.timeService.getMockDateState(),
            now: this.timeService.now(),
        };
    }
}

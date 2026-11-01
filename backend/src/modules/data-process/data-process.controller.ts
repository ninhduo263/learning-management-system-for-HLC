import {
    AllowSystemRoles,
    Authorization,
} from "@common/decorator/auth.decorator";
import { SystemRole } from "@module/user/common/constant";
import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { DataProcessService } from "./data-process.service";
import { ReplaceDomainUrlDto } from "./dto/replace-domain-url.dto";

@Controller("data-process")
@ApiTags("data-process")
@Authorization()
@AllowSystemRoles(SystemRole.ADMIN)
export class DataProcessController {
    constructor(private readonly dataProcessService: DataProcessService) {}

    @Post("replace-domain/sql")
    async replaceDomainSql(@Body() dto: ReplaceDomainUrlDto) {
        await this.dataProcessService.replaceDomainUrlSql(dto);
    }
}

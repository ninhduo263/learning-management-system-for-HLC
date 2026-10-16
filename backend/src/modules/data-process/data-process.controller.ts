import { Authorization } from "@common/decorator/auth.decorator";
import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { DataProcessService } from "./data-process.service";
import { ReplaceDomainUrlDto } from "./dto/replace-domain-url.dto";

@Controller("data-process")
@ApiTags("data-process")
@Authorization()
export class DataProcessController {
    constructor(private readonly dataProcessService: DataProcessService) {}

    @Post("replace-domain/mongo")
    async replaceDomainMongo(@Body() dto: ReplaceDomainUrlDto) {
        await this.dataProcessService.replaceDomainUrlMongo(dto);
    }

    @Post("replace-domain/sql")
    async replaceDomainSql(@Body() dto: ReplaceDomainUrlDto) {
        await this.dataProcessService.replaceDomainUrlSql(dto);
    }
}

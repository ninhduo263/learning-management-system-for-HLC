import { Authorization } from "@common/decorator/auth.decorator";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SsoService } from "./sso.service";

@Controller("sso")
@ApiTags("sso")
@Authorization()
export class SsoController {
    constructor(private readonly ssoService: SsoService) {}
}

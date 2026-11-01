import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { AuthConditionDto } from "./dto/auth-condition.dto";
import { Auth } from "./entities/auth.entity";

@Controller("auth")
@ApiTags("auth")
export class AuthController extends BaseControllerFactory(
    Auth,
    AuthConditionDto,
    Auth,
    Auth,
) {
    constructor(private readonly authService: AuthService) {
        super(authService);
    }
}

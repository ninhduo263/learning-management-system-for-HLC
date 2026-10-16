import { RequestAuthData } from "@common/constant/class/request-auth-data";
import { UserService } from "@module/user/service/user.service";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AccessSsoJwtPayload } from "../auth.interface";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly userService: UserService,
        private readonly configService: ConfigService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get("jwt.secret"),
        });
    }

    validate(payload: AccessSsoJwtPayload): RequestAuthData {
        return new RequestAuthData(payload, () => {
            return this.userService.internalGetById(payload.sub);
        });
    }
}

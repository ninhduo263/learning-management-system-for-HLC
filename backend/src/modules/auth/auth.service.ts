import { OperatorType, compareUserPassword } from "@common/constant";
import { Configuration } from "@config/configuration";
import { ApiError } from "@config/exception/api-error";
import { BaseService } from "@config/service/base.service";
import {
    AccessSsoJwtPayload,
    RefreshSsoJwtPayload,
} from "@module/auth/auth.interface";
import { Auth } from "@module/auth/entities/auth.entity";
import { AuthRepository } from "@module/auth/repository/auth-repository.interface";
import { Entity } from "@module/repository";
import { CreateDocument } from "@module/repository/common/base-repository.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { UserRepository } from "@module/user/repository/user-repository.interface";
import {
    BadRequestException,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { LogoutDto } from "@module/auth/dto/logout.dto";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectTransaction } from "@module/repository/common/transaction";
import { User } from "@module/user/entities/user.entity";
import { Request } from "express";
import moment from "moment";
import { UAParser } from "ua-parser-js";
import { LoginRequestDto } from "./dto/login-request.dto";
import { LoginResponseDto } from "./dto/login-response.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";

@Injectable()
export class AuthService extends BaseService<Auth, AuthRepository> {
    constructor(
        @InjectRepository(Entity.AUTH)
        private readonly authRepository: AuthRepository,
        @InjectRepository(Entity.USER)
        private readonly userRepository: UserRepository,
        @InjectTransaction()
        private readonly authTransaction: BaseTransaction,
        private readonly configService: ConfigService<Configuration>,
        private readonly jwtService: JwtService,
    ) {
        super(authRepository, { transaction: authTransaction });
    }

    async login(req: Request, dto: LoginRequestDto): Promise<LoginResponseDto> {
        const user = await this.validatePassword(dto.username, dto.password);
        const auth = await this.createEmptyAuth(user, {
            ip: req.ip,
            userAgent: req.headers["user-agent"],
            origin: req.headers["origin"],
            platform: dto.platform,
        });
        const { accessToken, refreshToken } = await this.generateTokens(
            user,
            auth,
        );
        return this.getLoginInfo(accessToken, refreshToken);
    }

    async logout(dto: LogoutDto) {
        const invoke = await this.revokeAuthByRefreshToken(dto.refreshToken);
        if (invoke) {
            return;
        } else {
            throw ApiError.Unauthorized("error-unauthorized");
        }
    }

    async createEmptyAuth(
        user: User,
        data: Pick<Auth, "ip" | "userAgent" | "origin" | "platform">,
    ) {
        const { ip, userAgent, origin, platform } = data;
        const userAgentData = new UAParser(userAgent).getResult();
        const doc: CreateDocument<Auth> = {
            ip,
            userAgent: userAgentData,
            origin,
            platform,
            user: user._id,
        };
        return this.authRepository.create(doc);
    }

    async generateTokens(user: User, auth: Auth) {
        if (!user) {
            throw new UnauthorizedException();
        }
        const { refreshExp } = this.configService.get("jwt", { infer: true });
        if (!auth.exp) {
            auth.exp = Math.floor(
                moment().add(refreshExp, "second").valueOf() / 1000,
            );
        }
        await this.authRepository.updateById(auth._id, auth);
        return this.getTokens(auth, user);
    }

    private async getTokens(auth: Auth, user: User) {
        if (!auth.jti && !auth.exp) {
            throw new BadRequestException();
        }
        const { secret, exp, refreshSecret } = this.configService.get("jwt", {
            infer: true,
        });
        const accessPayload: AccessSsoJwtPayload = {
            jti: auth.jti,
            sub: user._id,
            auth: auth._id,
            username: user.username,
            email: user.email,
            firstName: user.firstname,
            lastName: user.lastname,
            scope: undefined,
            platform: auth.platform,
            systemRole: user.systemRole,
        };
        const refreshPayload: RefreshSsoJwtPayload = {
            jti: auth.jti,
            sub: user._id,
            auth: auth._id,
            username: user.username,
            email: user.email,
            firstName: user.firstname,
            lastName: user.lastname,
            scope: null,
            platform: auth.platform,
            systemRole: user.systemRole,
            exp: auth.exp,
        };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(accessPayload, {
                secret,
                expiresIn: exp,
            }),
            this.jwtService.signAsync(refreshPayload, {
                secret: refreshSecret,
            }),
        ]);
        return { accessToken, refreshToken };
    }

    async refreshTokens(dto: RefreshTokenDto) {
        const payload = this.verifyRefreshToken(dto.refreshToken);
        const auth = await this.authRepository.getOne({
            _id: payload.auth,
            jti: payload.jti,
        });
        if (auth) {
            const user = await this.userRepository.getById(payload.sub);
            const { accessToken, refreshToken } = await this.generateTokens(
                user,
                auth,
            );
            return this.getLoginInfo(accessToken, refreshToken);
        } else {
            throw ApiError.Unauthorized("error-unauthorized");
        }
    }

    private getLoginInfo(
        accessToken: string,
        refreshToken: string,
    ): LoginResponseDto {
        const newAccessPayload = this.jwtService.decode(
            accessToken,
        ) as AccessSsoJwtPayload;
        const newRefreshPayload = this.jwtService.decode(
            refreshToken,
        ) as RefreshSsoJwtPayload;
        return {
            accessToken,
            refreshToken,
            accessExpireAt: newAccessPayload.exp,
            refreshExpireAt: newRefreshPayload.exp,
        };
    }

    async revokeAuthByRefreshToken(refreshToken: string) {
        const payload = this.verifyRefreshToken(refreshToken);
        return this.authRepository.deleteOne({
            _id: payload.auth,
            jti: payload.jti,
        });
    }

    private verifyRefreshToken(refreshToken: string) {
        const { refreshSecret } = this.configService.get("jwt", {
            infer: true,
        });
        try {
            const payload = this.jwtService.verify<RefreshSsoJwtPayload>(
                refreshToken,
                {
                    secret: refreshSecret,
                },
            );
            return payload;
        } catch (err) {
            console.error(err.message);
            throw ApiError.Unauthorized("error-unauthorized");
        }
    }

    private async validatePassword(username: string, password: string) {
        const user = await this.userRepository.getOne(
            { username },
            { enableDataPartition: false },
        );
        if (user) {
            const match = await compareUserPassword(password, user.password);
            if (match) {
                return user;
            }
        }
        throw ApiError.Unauthorized("error-unauthorized");
    }

    async testAuth() {
        const auth = await this.authRepository.getOne(
            {
                $and: [
                    {
                        $or: [{ ip: "a" }, { ip: { $in: ["d", "c"] } }],
                        ip: "c",
                    },
                    {
                        ip: "c",
                    },
                ],
            },
            {
                filters: [
                    {
                        operator: OperatorType.OR,
                        filters: [
                            {
                                field: "ip",
                                operator: OperatorType.EQUAL,
                                values: ["d"],
                            },
                            {
                                field: "ip",
                                operator: OperatorType.EQUAL,
                                values: ["c"],
                            },
                        ],
                    },
                ],
            },
        );
        // return auth;
        return this.authRepository.updateById(auth._id, {
            userAgent: { x: 1 },
            $inc: { exp: -1, test: 1 },
        });
    }
}

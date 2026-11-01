import { Configuration } from "@config/configuration";
import { AccessSsoJwtPayload } from "@module/auth/auth.interface";
import { AuthRepository } from "@module/auth/repository/auth-repository.interface";
import { InjectRedisClient } from "@module/redis/redis-client.provider";
import { Entity } from "@module/repository";
import { InjectRepository } from "@module/repository/common/repository";
import { SystemRole } from "@module/user/common/constant";
import { UserRepository } from "@module/user/repository/user-repository.interface";
import {
    Injectable,
    InternalServerErrorException,
    UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { JWTPayload, createLocalJWKSet, jwtVerify } from "jose";

@Injectable()
export class SsoService {
    private JWKS_CERTS_KEY = "jwts:certs";
    constructor(
        @InjectRepository(Entity.USER)
        private readonly userRepository: UserRepository,
        @InjectRepository(Entity.AUTH)
        private readonly authRepository: AuthRepository,
        @InjectRedisClient()
        private readonly redis: Redis,
        private readonly configService: ConfigService<Configuration>,
    ) {}

    async getUser(payload: AccessSsoJwtPayload) {
        return this.userRepository.getOne({ username: payload.username });
    }

    async initUser(payload: AccessSsoJwtPayload) {
        let res = await this.getUser(payload);
        if (!res) {
            res = await this.userRepository.create({
                ssoId: payload.sub,
                username: payload.username,
                email: payload.email,
                firstname: payload.firstName,
                lastname: payload.lastName,
                fullname: [payload.lastName, payload.firstName]
                    .filter(Boolean)
                    .join(" "),
                systemRole: SystemRole.USER,
            });
        }
        return res;
    }

    private async getCerts() {
        let certs = await this.redis.get(this.JWKS_CERTS_KEY);
        try {
            if (!certs) {
                const { jwksUri } = this.configService.get("sso", {
                    infer: true,
                });
                if (!jwksUri) {
                    throw new InternalServerErrorException();
                }
                certs = await fetch(jwksUri).then(async (res) =>
                    JSON.stringify(await res.json()),
                );
                this.redis.set(this.JWKS_CERTS_KEY, certs, "EX", 4);
            }
            return JSON.parse(certs);
        } catch (err) {
            console.error(err.mesasge);
            throw new InternalServerErrorException();
        }
    }

    async verify(bearer: string): Promise<JWTPayload> {
        if (bearer && bearer.substring(0, 7).toLowerCase() === "bearer ") {
            // Lấy token và verify với JWKS
            try {
                const token = bearer.substring(7);
                const certs = await this.getCerts();
                const JWKS = createLocalJWKSet(certs);
                const { payload } = await jwtVerify(token, JWKS);
                return payload;
            } catch (err) {
                console.error("??", err);
                throw new UnauthorizedException();
            }
        } else {
            throw new UnauthorizedException();
        }
    }
}

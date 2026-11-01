import { AuthSqlRepository } from "@module/auth/repository/auth-sql.repository";
import { UserSqlRepository } from "@module/user/repository/user-sql.repository";
import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { Global, Module } from "@nestjs/common";
import { SsoController } from "./sso.controller";
import { SsoService } from "./sso.service";

@Global()
@Module({
    providers: [
        SsoService,
        RepositoryProvider(Entity.USER, UserSqlRepository),
        RepositoryProvider(Entity.AUTH, AuthSqlRepository),
    ],
    controllers: [SsoController],
    exports: [SsoService],
})
export class SsoModule {}

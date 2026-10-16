import { AuthMongoRepository } from "@module/auth/repository/auth-mongo.repository";
import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { UserMongoRepository } from "@module/user/repository/user-mongo.repository";
import { Global, Module } from "@nestjs/common";
import { SsoController } from "./sso.controller";
import { SsoService } from "./sso.service";

@Global()
@Module({
    providers: [
        SsoService,
        RepositoryProvider(Entity.USER, UserMongoRepository),
        RepositoryProvider(Entity.AUTH, AuthMongoRepository),
    ],
    controllers: [SsoController],
    exports: [SsoService],
})
export class SsoModule {}

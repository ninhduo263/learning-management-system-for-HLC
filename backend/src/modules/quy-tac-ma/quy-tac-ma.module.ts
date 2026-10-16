import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { Module } from "@nestjs/common";
import { HamSinhMaService } from "./ham-sinh-ma.service";
import { QuyTacMaService } from "./quy-tac-ma.service";
import { HamSinhMaMongoRepository } from "./repository/ham-sinh-ma-mongo.repository";
import { QuyTacMaMongoRepository } from "./repository/quy-tac-ma-mongo.repository";

@Module({
    providers: [
        QuyTacMaService,
        HamSinhMaService,
        RepositoryProvider(Entity.QUY_TAC_MA, QuyTacMaMongoRepository),
        RepositoryProvider(Entity.HAM_SINH_MA, HamSinhMaMongoRepository),
    ],
})
export class QuyTacMaModule {}

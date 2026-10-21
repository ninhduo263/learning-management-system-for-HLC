import { HamSinhMaSqlRepository } from "@module/quy-tac-ma/repository/ham-sinh-ma-sql.repository";
import { QuyTacMaSqlRepository } from "@module/quy-tac-ma/repository/quy-tac-ma-sql.repository.interface";
import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { Module } from "@nestjs/common";
import { HamSinhMaService } from "./ham-sinh-ma.service";
import { QuyTacMaService } from "./quy-tac-ma.service";

@Module({
    providers: [
        QuyTacMaService,
        HamSinhMaService,
        RepositoryProvider(Entity.QUY_TAC_MA, QuyTacMaSqlRepository),
        RepositoryProvider(Entity.HAM_SINH_MA, HamSinhMaSqlRepository),
    ],
})
export class QuyTacMaModule {}

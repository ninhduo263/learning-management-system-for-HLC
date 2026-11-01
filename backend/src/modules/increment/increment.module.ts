import { IncrementSqlRepository } from "@module/increment/repository/increment-sql.repository";
import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { Module } from "@nestjs/common";
import { IncrementService } from "./increment.service";

@Module({
    providers: [
        RepositoryProvider(Entity.INCREMENT, IncrementSqlRepository),
        IncrementService,
    ],
    exports: [IncrementService],
})
export class IncrementModule {}

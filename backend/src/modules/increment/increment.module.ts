import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { Module } from "@nestjs/common";
import { IncrementService } from "./increment.service";
import { IncrementMongoRepository } from "./repository/increment-mongo-repository";

@Module({
    providers: [
        RepositoryProvider(Entity.INCREMENT, IncrementMongoRepository),
        IncrementService,
    ],
    exports: [IncrementService],
})
export class IncrementModule {}

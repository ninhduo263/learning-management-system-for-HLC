import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { TransactionProvider } from "@module/repository/common/transaction";
import { MongoTransaction } from "@module/repository/mongo/mongo.transaction";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MulterModule } from "@nestjs/platform-express";
import { MulterConfigService } from "./common/multer-config.service";
import { FilePublicController } from "./file-public.controller";
import { FileController } from "./file.controller";
import { FileService } from "./file.service";
import { FileMongoRepository } from "./repository/file-mongo.repository";

@Module({
    imports: [
        MulterModule.registerAsync({
            useClass: MulterConfigService,
            inject: [ConfigService],
        }),
        JwtModule.register({}),
    ],
    providers: [
        FileService,
        RepositoryProvider(Entity.FILE, FileMongoRepository),
        TransactionProvider(MongoTransaction),
    ],
    controllers: [FileController, FilePublicController],
})
export class FileModule {}

import { SqlTransaction } from "@module/repository/sequelize/sql.transaction";
import { FileSqlRepository } from "@module/file/repository/file-sql.repository";
import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { TransactionProvider } from "@module/repository/common/transaction";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MulterModule } from "@nestjs/platform-express";
import { MulterConfigService } from "./common/multer-config.service";
import { FilePublicController } from "./file-public.controller";
import { FileController } from "./file.controller";
import { FileService } from "./file.service";

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
        RepositoryProvider(Entity.FILE, FileSqlRepository),
        TransactionProvider(SqlTransaction),
    ],
    controllers: [FileController, FilePublicController],
})
export class FileModule {}

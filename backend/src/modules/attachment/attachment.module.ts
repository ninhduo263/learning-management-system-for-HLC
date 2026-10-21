import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { TransactionProvider } from "@module/repository/common/transaction";
import { SqlTransaction } from "@module/repository/sequelize/sql.transaction";
import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { AttachmentController } from "./controllers/attachment.controller";
import { AttachmentModel } from "./models/attachment.model";
import { AttachmentSqlRepository } from "./repositories/attachment-sql.repository";
import { AttachmentService } from "./services/attachment.service";

@Module({
    imports: [SequelizeModule.forFeature([AttachmentModel])],
    controllers: [AttachmentController],
    providers: [
        AttachmentService,
        RepositoryProvider(Entity.ATTACHMENT, AttachmentSqlRepository),
        SqlTransaction,
        TransactionProvider(SqlTransaction),
    ],
    exports: [AttachmentService],
})
export class AttachmentModule {}

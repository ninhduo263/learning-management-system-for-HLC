import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { TransactionProvider } from "@module/repository/common/transaction";
import { SqlTransaction } from "@module/repository/sequelize/sql.transaction";
import { Global, Module } from "@nestjs/common";
import { AttachmentFlowService } from "./attachment-flow.service";
import { SequelizeModule } from "@nestjs/sequelize";
import { AttachmentController } from "./controllers/attachment.controller";
import { AttachmentModel } from "./models/attachment.model";
import { AttachmentSqlRepository } from "./repositories/attachment-sql.repository";
import { AttachmentService } from "./services/attachment.service";

@Global()
@Module({
    imports: [SequelizeModule.forFeature([AttachmentModel])],
    controllers: [AttachmentController],
    providers: [
        AttachmentFlowService,
        AttachmentService,
        RepositoryProvider(Entity.ATTACHMENT, AttachmentSqlRepository),
        SqlTransaction,
        TransactionProvider(SqlTransaction),
    ],
    exports: [AttachmentService, AttachmentFlowService],
})
export class AttachmentModule {}

import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { TransactionProvider } from "@module/repository/common/transaction";
import { SqlTransaction } from "@module/repository/sequelize/sql.transaction";
import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { DepartmentController } from "./controllers/department.controller";
import { DepartmentModel } from "./models/department.model";
import { DepartmentSqlRepository } from "./repositories/department-sql.repository";
import { DepartmentService } from "./services/department.service";
import { PositionController } from "./controllers/position.controller";
import { PositionModel } from "./models/position.model";
import { PositionSqlRepository } from "./repositories/position-sql.repository";
import { PositionService } from "./services/position.service";
import { MemberPositionController } from "./controllers/member-position.controller";
import { MemberPositionModel } from "./models/member-position.model";
import { MemberPositionSqlRepository } from "./repositories/member-position-sql.repository";
import { MemberPositionService } from "./services/member-position.service";

@Module({
    imports: [
        SequelizeModule.forFeature([
            DepartmentModel,
            PositionModel,
            MemberPositionModel,
        ]),
    ],
    controllers: [
        DepartmentController,
        PositionController,
        MemberPositionController,
    ],
    providers: [
        DepartmentService,
        PositionService,
        MemberPositionService,
        RepositoryProvider(Entity.DEPARTMENT, DepartmentSqlRepository),
        RepositoryProvider(Entity.POSITION, PositionSqlRepository),
        RepositoryProvider(Entity.MEMBER_POSITION, MemberPositionSqlRepository),
        SqlTransaction,
        TransactionProvider(SqlTransaction),
    ],
    exports: [DepartmentService, PositionService, MemberPositionService],
})
export class OrganizationModule {}

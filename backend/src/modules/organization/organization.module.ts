import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { TransactionProvider } from "@module/repository/common/transaction";
import { SqlTransaction } from "@module/repository/sequelize/sql.transaction";
import { Global, Module } from "@nestjs/common";
import { GroupAccessService } from "./flow/group-access.service";
import { GroupController } from "./flow/group.controller";
import { GroupFlowService } from "./flow/group-flow.service";
import { GroupMembershipModel } from "./models/group-membership.model";
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

@Global()
@Module({
    imports: [
        SequelizeModule.forFeature([
            DepartmentModel,
            PositionModel,
            MemberPositionModel,
            GroupMembershipModel,
        ]),
    ],
    controllers: [
        GroupController,
        DepartmentController,
        PositionController,
        MemberPositionController,
    ],
    providers: [
        GroupAccessService,
        GroupFlowService,
        DepartmentService,
        PositionService,
        MemberPositionService,
        RepositoryProvider(Entity.DEPARTMENT, DepartmentSqlRepository),
        RepositoryProvider(Entity.POSITION, PositionSqlRepository),
        RepositoryProvider(Entity.MEMBER_POSITION, MemberPositionSqlRepository),
        SqlTransaction,
        TransactionProvider(SqlTransaction),
    ],
    exports: [
        DepartmentService,
        PositionService,
        MemberPositionService,
        GroupAccessService,
        GroupFlowService,
    ],
})
export class OrganizationModule {}

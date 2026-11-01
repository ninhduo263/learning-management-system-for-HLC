import { Global, Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { SequelizeModel } from "./sequelize/common/sequelize-model";

/** Đăng ký toàn bộ model Sequelize một lần để mọi repository SQL inject được. */
@Global()
@Module({
    imports: [SequelizeModule.forFeature(SequelizeModel)],
    exports: [SequelizeModule],
})
export class RepositoryModule {}

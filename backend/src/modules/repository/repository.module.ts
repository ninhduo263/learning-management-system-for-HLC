import MongooseSchemaProvider from "@module/repository/mongo/mongoose-model-provider";
import { Global, Module } from "@nestjs/common";

import MongooseModel from "./mongo/mongoose-model";

@Global()
@Module({
    imports: [
        MongooseModel,
        // SequelizeModule.forFeature(SequelizeModel),
    ],
    providers: [
        ...MongooseSchemaProvider,
        // SequelizeService,
    ],
    exports: [
        MongooseModel,
        ...MongooseSchemaProvider,
        // SequelizeModule,
    ],
})
export class RepositoryModule {}

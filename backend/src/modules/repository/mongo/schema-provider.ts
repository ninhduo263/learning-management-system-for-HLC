import { Auth } from "@module/auth/entities/auth.entity";
import { Configuration } from "@config/configuration";
import { Entity } from "@module/repository";
import { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
    getModelToken,
    SchemaFactory,
    getConnectionToken,
} from "@nestjs/mongoose";
import mongoose from "mongoose";

export const AuthModelProvider: Provider = {
    provide: getModelToken(Entity.AUTH),
    useFactory: (
        configService: ConfigService<Configuration>,
        connection: mongoose.Connection,
    ) => {
        const schema = SchemaFactory.createForClass(Auth);
        const refreshExp = configService.get("jwt.refreshExp", { infer: true });
        schema.index({ createdAt: 1 }, { expireAfterSeconds: refreshExp });
        const model = connection.model(Entity.AUTH, schema);
        return model;
    },
    inject: [ConfigService, getConnectionToken()],
};

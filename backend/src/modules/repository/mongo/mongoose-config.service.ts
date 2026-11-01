import { Configuration } from "@config/configuration";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
    MongooseModuleOptions,
    MongooseOptionsFactory,
} from "@nestjs/mongoose";
import mongoose from "mongoose";
import mongooseLeanDefaults from "mongoose-lean-defaults";
import mongooseLeanGetters from "mongoose-lean-getters";
import mongooseLeanVirtuals from "mongoose-lean-virtuals";

@Injectable()
export class MongooseConfigService implements MongooseOptionsFactory {
    constructor(private readonly configService: ConfigService<Configuration>) {}

    createMongooseOptions(): MongooseModuleOptions {
        const uri = this.configService.get("mongodb.uri", { infer: true });
        mongoose.plugin(mongooseLeanDefaults);
        mongoose.plugin(mongooseLeanGetters);
        mongoose.plugin(mongooseLeanVirtuals);
        if (uri) {
            return {
                uri,
                retryDelay: 5000,
            };
        } else {
            const { host, port, name, username, password } =
                this.configService.get("mongodb", { infer: true });
            return {
                uri: `mongodb://${host}:${port}/${name}`,
                user: username,
                pass: password,
                authSource: "admin",
                directConnection: true,
                retryDelay: 5000,
            };
        }
    }
}

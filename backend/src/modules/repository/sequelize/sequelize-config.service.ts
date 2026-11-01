import { Configuration, Environment } from "@config/configuration";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
    SequelizeModuleOptions,
    SequelizeOptionsFactory,
} from "@nestjs/sequelize";
import { Dialect } from "sequelize";
import { SequelizeModel } from "./common/sequelize-model";

@Injectable()
export class SequelizeConfigService implements SequelizeOptionsFactory {
    constructor(private readonly configService: ConfigService<Configuration>) {}
    createSequelizeOptions(): SequelizeModuleOptions {
        const {
            type,
            host,
            port,
            username,
            password,
            schema,
            database,
            maxPool,
        } = this.configService.get("sql", { infer: true });
        const environment = this.configService.get("server.env", {
            infer: true,
        });
        return {
            dialect: type as Dialect,
            host,
            port,
            username,
            password,
            schema,
            database,
            models: SequelizeModel,
            pool: {
                max: maxPool,
            },
            autoLoadModels: true,
            logging: environment !== Environment.PRODUCTION,
            synchronize: environment !== Environment.PRODUCTION,
            sync: {
                alter: true,
            },
            dialectOptions: {
                useUTC: false,
            },
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
    }
}

import { Type } from "@nestjs/common";
import { SettingFileStorage } from "../entities/value/setting-file-storage.entity";
import { SettingInitData } from "../entities/value/setting-init-data.entity";
import { SettingServer } from "../entities/value/setting-server.entity";
import { SettingSecurity } from "../entities/value/setting-security.entity";

export enum SettingKey {
    INIT_DATA = "INIT_DATA",
    FILE_STORAGE = "FILE_STORAGE",
    SERVER = "SERVER",
    SECURITY = "SECURITY",
}

export const MAP_SETTING_ENTITY: { [key in SettingKey]?: Type<unknown> } = {
    [SettingKey.INIT_DATA]: SettingInitData,
    [SettingKey.FILE_STORAGE]: SettingFileStorage,
    [SettingKey.SERVER]: SettingServer,
    [SettingKey.SECURITY]: SettingSecurity,
};

export type SettingValue<T> = T extends SettingKey.INIT_DATA
    ? SettingInitData
    : T extends SettingKey.FILE_STORAGE
      ? SettingFileStorage
      : T extends SettingKey.SERVER
        ? SettingServer
        : Record<string, unknown>;

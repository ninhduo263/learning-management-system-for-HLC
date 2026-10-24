import { ActivityLogService } from "@module/activity-log/activity-log.service";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { SettingKey } from "./common/constant";
import { SettingSecurity } from "./entities/value/setting-security.entity";
import { SettingService } from "./setting.service";

export const SECURITY_DEFAULTS: Required<SettingSecurity> = {
    forcePasswordChangeOnFirstLogin: false,
    memberCanEditProfileUrl: false,
};

const LABELS: Record<keyof SettingSecurity, string> = {
    forcePasswordChangeOnFirstLogin: "Bắt buộc đổi mật khẩu lần đăng nhập đầu",
    memberCanEditProfileUrl: "MTE / MTO tự sửa link profile",
};

/** Công tắc cấu hình hệ thống (Admin toàn cục) */
@Injectable()
export class SecurityConfigService {
    constructor(
        private readonly settingService: SettingService,
        private readonly activityLog: ActivityLogService,
    ) {}

    async get(): Promise<Required<SettingSecurity>> {
        const value = await this.settingService
            .getSettingValue(SettingKey.SECURITY)
            .catch(() => null);
        return { ...SECURITY_DEFAULTS, ...(value ?? {}) };
    }

    async set(user: User, dto: SettingSecurity) {
        const before = await this.get();
        const next = {
            ...before,
            ...Object.fromEntries(
                Object.entries(dto).filter(
                    ([key, value]) =>
                        key in SECURITY_DEFAULTS && typeof value === "boolean",
                ),
            ),
        } as Required<SettingSecurity>;
        await this.settingService.setSettingValue(SettingKey.SECURITY, next);
        const changes = (
            Object.keys(SECURITY_DEFAULTS) as (keyof SettingSecurity)[]
        )
            .filter((key) => before[key] !== next[key])
            .map(
                (key) =>
                    `${LABELS[key]}: ${before[key] ? "bật" : "tắt"} → ${next[key] ? "bật" : "tắt"}`,
            );
        if (changes.length)
            await this.activityLog.log(user, {
                module: "SYSTEM",
                action: "CONFIG_UPDATE",
                summary: `Đổi cấu hình: ${changes.join("; ")}`,
                detail: { before, after: next },
            });
        return next;
    }
}

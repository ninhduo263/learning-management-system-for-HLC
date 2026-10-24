import { ActivityLogService } from "@module/activity-log/activity-log.service";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { SettingKey } from "./common/constant";
import { SettingSecurity } from "./entities/value/setting-security.entity";
import { SettingService } from "./setting.service";

export const SECURITY_DEFAULTS: Required<SettingSecurity> = {
    forcePasswordChangeOnFirstLogin: false,
    memberCanEditProfileUrl: false,
    allowUnlockPaidPeriod: true,
};

const LABELS: Record<keyof SettingSecurity, string> = {
    forcePasswordChangeOnFirstLogin: "Bắt buộc đổi mật khẩu lần đăng nhập đầu",
    memberCanEditProfileUrl: "MTE / MTO tự sửa link profile",
    allowUnlockPaidPeriod:
        "Mở khóa kỳ đã xác nhận đã chi (giai đoạn thử nghiệm)",
};

/** Công tắc cấu hình hệ thống (Admin toàn cục) */
@Injectable()
export class SecurityConfigService {
    constructor(
        private readonly settingService: SettingService,
        private readonly activityLog: ActivityLogService,
    ) {}

    private cache: { at: number; value: Required<SettingSecurity> } | null =
        null;

    /** Đọc cấu hình (đệm 10 giây vì guard gọi ở mọi request) */
    async get(): Promise<Required<SettingSecurity>> {
        if (this.cache && Date.now() - this.cache.at < 10_000)
            return this.cache.value;
        const value = await this.settingService
            .getSettingValue(SettingKey.SECURITY)
            .catch(() => null);
        const merged = { ...SECURITY_DEFAULTS, ...(value ?? {}) };
        this.cache = { at: Date.now(), value: merged };
        return merged;
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
        this.cache = null;
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

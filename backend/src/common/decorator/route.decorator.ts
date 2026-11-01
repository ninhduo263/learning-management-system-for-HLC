import { GwGuard } from "@common/guard/gw.guard";
import { Controller, UseGuards, applyDecorators } from "@nestjs/common";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";

export const PublicController = (name: string) =>
    applyDecorators(Controller(`public/${name}`), ApiTags(`[Public] ${name}`));

export const InternalController = (name: string) =>
    applyDecorators(
        Controller(`internal/${name}`),
        ApiTags(`[Internal] ${name}`),
        UseGuards(GwGuard),
        ApiSecurity("apiKey"),
        ApiSecurity("gwApiKey"),
    );

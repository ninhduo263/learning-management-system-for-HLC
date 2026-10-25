import { RequestAuthData } from "@common/constant/class/request-auth-data";
import { User } from "@module/user/entities/user.entity";
import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from "@nestjs/common";
import { Request } from "express";
import { from, mergeMap } from "rxjs";
import { PhonePrivacyService } from "./services/phone-privacy.service";

/** Áp quy tắc ẩn số điện thoại cho mọi phản hồi HTTP (xem PhonePrivacyService) */
@Injectable()
export class PhonePrivacyInterceptor implements NestInterceptor {
    constructor(private readonly phonePrivacy: PhonePrivacyService) {}

    intercept(context: ExecutionContext, next: CallHandler) {
        if (context.getType() !== "http") return next.handle();
        const request = context.switchToHttp().getRequest<Request>();
        return next.handle().pipe(
            mergeMap((data) =>
                from(
                    (async () => {
                        const viewer =
                            request.user instanceof RequestAuthData
                                ? await request.user.getUser()
                                : ((request.user as User) ?? null);
                        await this.phonePrivacy.redact(data, viewer ?? null);
                        return data;
                    })(),
                ),
            ),
        );
    }
}

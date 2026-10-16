import { AccessSsoJwtPayload } from "@module/auth/auth.interface";
import { User } from "@module/user/entities/user.entity";

export class RequestAuthData {
    constructor(
        private payload: AccessSsoJwtPayload,
        private userQuery: () => Promise<User>,
        private user: User = undefined,
    ) {}

    getPayload() {
        return this.payload;
    }

    getUserQuery() {
        return this.userQuery;
    }

    async getUser() {
        if (this.user === undefined) {
            this.user = await this.userQuery();
        }
        return this.user;
    }
}

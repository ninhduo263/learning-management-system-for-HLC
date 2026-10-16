import { RequestAuthData } from "@common/constant/class/request-auth-data";
import { ApiRecordResponse } from "@common/decorator/api.decorator";
import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { Body, Controller, Get, Put, Req } from "@nestjs/common";

import { ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { ChangePasswordDto } from "../dto/change-password.dto";
import { User } from "../entities/user.entity";
import { UserService } from "../service/user.service";

@Controller("user")
@ApiTags("user")
export class UserController extends BaseControllerFactory<User>(
    User,
    null,
    null,
    null,
    {
        import: {
            enable: false,
        },
        routes: {
            create: {
                enable: true,
                document: {
                    operator: {
                        summary: "Create a new User",
                        description:
                            "Create a new User record. Throw error if User with the same username existed",
                    },
                    response: { description: "Created User data" },
                },
            },
        },
        dataPartition: {
            enable: true,
        },
        authorize: false,
    },
) {
    constructor(private readonly userService: UserService) {
        super(userService);
    }

    @Get("me")
    @ApiRecordResponse(User)
    // @UseAuditLog({
    //     action: "getMe",
    //     sourceId: "response.data._id",
    //     description:
    //         "{{uName}} lấy thông tin user của mình (_id: {{response.data._id}})",
    //     logResponse: true,
    // })
    async getMe(@Req() req: Request) {
        const authData = req.user as RequestAuthData;
        return this.userService.getMe(authData);
    }

    @Put("me/password")
    @ApiRecordResponse(User)
    async changePasswordMe(@Body() dto: ChangePasswordDto) {
        return this.userService.changePasswordMe(null, dto);
    }

    // @Get("test")
    // async test() {
    //     return this.userService.testUser();
    // }
}

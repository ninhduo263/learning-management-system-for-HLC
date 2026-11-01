import { ApiRecordResponse } from "@common/decorator/api.decorator";
import { AuthService } from "@module/auth/auth.service";
import { Body, Controller, Post, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { LoginRequestDto } from "./dto/login-request.dto";
import { LoginResponseDto } from "./dto/login-response.dto";
import { LogoutDto } from "./dto/logout.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { Auth } from "./entities/auth.entity";

@Controller("auth")
@ApiTags("auth")
export class AuthPublicController {
    constructor(private readonly authService: AuthService) {}

    @ApiRecordResponse(LoginResponseDto)
    @Post("login")
    async login(@Req() req: Request, @Body() dto: LoginRequestDto) {
        return this.authService.login(req, dto);
    }

    @ApiRecordResponse(Auth)
    @Post("logout")
    async logout(@Body() dto: LogoutDto) {
        await this.authService.logout(dto);
    }

    @ApiRecordResponse(LoginRequestDto)
    @Post("refresh")
    async refreshToken(@Body() dto: RefreshTokenDto) {
        return this.authService.refreshTokens(dto);
    }
}

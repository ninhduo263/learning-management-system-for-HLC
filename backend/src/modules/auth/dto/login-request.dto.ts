import { User } from "@module/user/entities/user.entity";
import { PickType } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { ClientPlatform } from "../common/constant";

export class LoginRequestDto extends PickType(User, ["username", "password"]) {
    @IsEnum(ClientPlatform)
    platform: ClientPlatform;
}

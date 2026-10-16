import { PickType } from "@nestjs/swagger";
import { OneSignalUser } from "../entities/one-signal-user.entity";

export class UpdateOneSignalUserDto extends PickType(OneSignalUser, [
    "playerId",
]) {}

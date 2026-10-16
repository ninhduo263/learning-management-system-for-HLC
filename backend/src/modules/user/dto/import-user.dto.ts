import { PickType } from "@nestjs/swagger";
import { User } from "../entities/user.entity";

export class ImportUserDto extends PickType(User, [
    "username",
    "firstname",
    "lastname",
    "email",
    "password",
    "systemRole",
]) {}

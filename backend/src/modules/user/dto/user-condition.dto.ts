import { PartialType } from "@nestjs/swagger";
import { User } from "../entities/user.entity";

export class UserConditionDto extends PartialType(User) {}

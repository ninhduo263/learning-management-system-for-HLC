import { CreateUserDto } from "@module/user/dto/create-user.dto";
import { PartialType } from "@nestjs/swagger";

export class UpdateUserDto extends PartialType(CreateUserDto) {}

import { IsNotEmpty, IsString } from "class-validator";

export class ChangePasswordDto {
    @IsNotEmpty()
    @IsString()
    oldPass: string;

    @IsNotEmpty()
    @IsString()
    newPass: string;
}

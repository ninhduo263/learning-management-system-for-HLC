import { IsBoolean } from "class-validator";

export class QuarterLockDto {
    @IsBoolean()
    isLocked: boolean;
}

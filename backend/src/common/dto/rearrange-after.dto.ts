import { IsNumber, IsOptional, Min } from "class-validator";

export class RearrangeAfterDto {
    @IsNumber()
    @IsOptional()
    @Min(1)
    order?: number;
}

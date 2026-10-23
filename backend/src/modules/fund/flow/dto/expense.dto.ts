import {
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Matches,
    Min,
} from "class-validator";

export class ExpenseDto {
    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    expenseDate: string;

    @IsNumber()
    @Min(1)
    amount: number;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsString()
    @IsOptional()
    category?: string;
}

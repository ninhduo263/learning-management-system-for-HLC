import { IsString } from "class-validator";
export class UpdateEventDto {
    @IsString()
    ten_su_kien: string;

    @IsString()
    dia_diem: string;

    @IsString()
    ngay_bat_dau: string;

    @IsString()
    ngay_ket_thuc: string;

    @IsString()
    ghi_chu: string;
}

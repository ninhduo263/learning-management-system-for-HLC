import { ApiProperty } from "@nestjs/swagger";
import { ResponseDto } from "./response.dto";

export class ResponseDataDto<T = unknown> extends ResponseDto {
    @ApiProperty()
    data: any;

    constructor(data: T) {
        super(true);
        this.data = data;
    }
}

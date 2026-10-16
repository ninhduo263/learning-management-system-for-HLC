import { ErrorCode } from "@config/exception/error-code";
import { HttpStatus } from "@nestjs/common";
import { ApiHideProperty, ApiProperty } from "@nestjs/swagger";
import { ResponseDto } from "./response.dto";

export class ResponseErrorDto extends ResponseDto {
    code: ErrorCode;

    @ApiProperty({ example: false })
    success: boolean;

    @ApiProperty({ type: Number, example: 500 })
    status: HttpStatus;

    message: string;

    @ApiHideProperty()
    detail?: any;

    constructor(code: ErrorCode, status: HttpStatus, message: string) {
        super(false);
        this.code = code;
        this.status = status;
        this.message = message;
    }

    getCode() {
        return this.code;
    }

    getStatus() {
        return this.status;
    }
}

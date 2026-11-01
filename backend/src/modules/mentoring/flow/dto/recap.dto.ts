import {
    ArrayMaxSize,
    ArrayMinSize,
    IsNotEmpty,
    IsString,
} from "class-validator";

export class RecapDto {
    @IsString()
    @IsNotEmpty()
    content: string;

    /** _id các file đã upload qua POST /file (ít nhất 1 ảnh minh chứng) */
    @IsString({ each: true })
    @ArrayMinSize(1)
    @ArrayMaxSize(10)
    fileIds: string[];
}

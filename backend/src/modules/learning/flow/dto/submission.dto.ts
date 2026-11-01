import { IsObject } from "class-validator";

export class SubmissionDto {
    /**
     * Giá trị theo key của trường. IMAGE/FILE: mảng fileId (POST /file);
     * LIBRARY_ITEM: _id sách/tài liệu; MULTI_SELECT: mảng chuỗi.
     */
    @IsObject()
    data: Record<string, unknown>;
}

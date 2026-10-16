import { ApiProperty } from "@nestjs/swagger";
import { CommonQueryDto } from "./common-query.dto";

export class PageableDto<E = any> {
    total: number;
    skip: number;
    limit: number;
    page: number;

    @ApiProperty()
    result: E[];

    constructor(
        page: number,
        skip: number,
        limit: number,
        total: number,
        result: E[],
    ) {
        Object.assign(this, {
            page,
            skip,
            limit,
            total,
            result,
        });
    }

    static create(
        query: Pick<CommonQueryDto, "page" | "skip" | "limit">,
        total: number,
        result: any[],
    ): PageableDto {
        return new PageableDto(
            query.page,
            query.skip,
            query.limit,
            total,
            result,
        );
    }
}

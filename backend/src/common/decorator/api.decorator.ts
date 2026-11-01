import { PageableDto } from "@common/dto/pageable.dto";
import { BaseRouteConfig } from "@config/controller/base-controller.interface";
import { applyDecorators, Controller, HttpStatus, Type } from "@nestjs/common";
import {
    ApiExtraModels,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiResponseOptions,
    getSchemaPath,
} from "@nestjs/swagger";
import {
    ReferenceObject,
    SchemaObject,
} from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import { ResponseDataDto } from "../dto/response-data.dto";
import { ResponseErrorDto } from "../dto/response-error.dto";

function generateDocument(
    schema: SchemaObject & Partial<ReferenceObject>,
    document?: BaseRouteConfig["document"],
) {
    const decorators: MethodDecorator[] = [];
    if (document?.operator) {
        decorators.push(ApiOperation(document.operator));
    }
    if (document?.param) {
        decorators.push(...document.param.map((item) => ApiParam(item)));
    }
    if (document?.query) {
        decorators.push(...document.query.map((item) => ApiQuery(item)));
    }
    let responseOptions: ApiResponseOptions = {
        status: document?.response?.status ?? HttpStatus.OK,
        schema,
    };
    if (document?.response) {
        responseOptions = Object.assign(document.response, responseOptions);
    }
    decorators.push(ApiResponse(responseOptions));
    if (document?.errorResponses) {
        decorators.push(
            ...document.errorResponses.map((item) =>
                ApiErrorDoc(item.statusCode, ...item.errors),
            ),
        );
    }
    return decorators;
}

export const ApiRecordResponse = <T extends Type<any>>(
    model: T,
    document?: BaseRouteConfig["document"],
) => {
    const decorators = generateDocument(
        {
            $ref: getSchemaPath(ResponseDataDto),
            properties: {
                data: {
                    $ref: getSchemaPath(model),
                },
            },
        },
        document,
    );
    return applyDecorators(
        ...decorators,
        ApiExtraModels(ResponseDataDto, model),
    );
};

export const ApiListResponse = <T extends Type<any>>(
    model: T,
    document?: BaseRouteConfig["document"],
) => {
    const decorators = generateDocument(
        {
            allOf: [
                { $ref: getSchemaPath(ResponseDataDto) },
                {
                    properties: {
                        data: {
                            type: "array",
                            items: {
                                $ref: getSchemaPath(model),
                            },
                        },
                    },
                },
            ],
        },
        document,
    );
    return applyDecorators(
        ...decorators,
        ApiExtraModels(ResponseDataDto, model),
    );
};

export const ApiPageResponse = <T extends Type<any>>(
    model: T,
    document?: BaseRouteConfig["document"],
) => {
    const decorators = generateDocument(
        {
            $ref: getSchemaPath(ResponseDataDto),
            properties: {
                data: {
                    $ref: getSchemaPath(PageableDto),
                    properties: {
                        result: {
                            type: "array",
                            items: { $ref: getSchemaPath(model) },
                        },
                    },
                },
            },
        },
        document,
    );
    return applyDecorators(
        ...decorators,
        ApiExtraModels(ResponseDataDto, PageableDto, model),
    );
};

export const ApiStringResponse = (document?: BaseRouteConfig["document"]) => {
    const decorators = generateDocument(
        {
            $ref: getSchemaPath(ResponseDataDto),
            properties: {
                data: {
                    type: "string",
                },
            },
        },
        document,
    );
    return applyDecorators(...decorators);
};

export const ApiNumberResponse = (document?: BaseRouteConfig["document"]) => {
    return applyDecorators(
        ...generateDocument(
            {
                $ref: getSchemaPath(ResponseDataDto),
                properties: {
                    data: {
                        type: "number",
                    },
                },
            },
            document,
        ),
    );
};

export const ApiBoolResponse = (document?: BaseRouteConfig["document"]) => {
    return applyDecorators(
        ...generateDocument(
            {
                $ref: getSchemaPath(ResponseDataDto),
                properties: {
                    data: {
                        type: "boolean",
                    },
                },
            },
            document,
        ),
    );
};

export const ApiCondition = () =>
    applyDecorators(
        ApiQuery({ name: "condition", type: String, required: false }),
        ApiQuery({ name: "filters[]", type: Array, required: false }),
    );

export const ApiGet = (
    props: { mode: "default" | "page" | "many" | "one" } = { mode: "default" },
) => {
    const decorators: MethodDecorator[] = [];
    switch (props.mode) {
        case "default":
        case "page": {
            decorators.push(
                ApiQuery({
                    name: "page",
                    required: false,
                    example: 1,
                }),
                ApiQuery({
                    name: "limit",
                    required: false,
                    example: 20,
                }),
            );
            break;
        }
        case "many":
        case "one": {
            break;
        }
    }
    decorators.push(
        ApiQuery({
            name: "select",
            required: false,
            examples: {
                Default: {
                    value: "",
                },
                Include: {
                    value: "createdAt updatedAt",
                },
                Exclude: {
                    value: "-createdAt -updatedAt",
                },
            },
        }),
        ApiQuery({
            name: "sort",
            required: false,
            examples: {
                Default: {
                    value: "",
                },
                Sort: {
                    value: { createdAt: -1, updatedAt: 1 },
                },
            },
        }),
        ApiQuery({ name: "population[]", type: Array, required: false }),
    );
    return applyDecorators(...decorators);
};

export type ErrorData = Pick<ResponseErrorDto, "code" | "message">;

const getDoc = (errors: ErrorData[]) =>
    `<table><thead><tr><th>Code</th><th>Message</th></tr></thead><tbody>${errors
        .map((e) => `<tr><td>${e.code}</td><td>${e.message}</td></tr>`)
        .join("")}</tbody></table>`;

export const ApiErrorDoc = (statusCode: HttpStatus, ...errors: ErrorData[]) =>
    ApiResponse({
        status: statusCode,
        description: getDoc(errors),
        type: ResponseErrorDto,
    });

export const ApiCommonErrorDocs = () =>
    applyDecorators(
        ApiErrorDoc(HttpStatus.UNAUTHORIZED, {
            code: null,
            message: "Xác thực không hợp lệ",
        }),
        ApiErrorDoc(HttpStatus.INTERNAL_SERVER_ERROR, {
            code: null,
            message: "Lỗi hệ thống không xác định",
        }),
    );

export const PublicController = (name: string | string[]) => {
    if (Array.isArray(name)) {
        return Controller(name.map((n) => `${n}/public`));
    } else {
        return Controller(`${name}/public`);
    }
};

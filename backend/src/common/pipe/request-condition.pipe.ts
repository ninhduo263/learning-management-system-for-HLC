import { ClientCommonCondition } from "@common/constant/class/client-common-condition";
import { BadRequestException, PipeTransform } from "@nestjs/common";
import { IntersectionType } from "@nestjs/swagger";
import {
    ClassConstructor,
    instanceToPlain,
    plainToClass,
} from "class-transformer";
import { validateOrReject } from "class-validator";

export class RequestConditionPipe implements PipeTransform {
    constructor(private readonly schema: ClassConstructor<unknown>) {}

    async transform(value: string) {
        try {
            const plain = JSON.parse(value ?? "{}");
            const condition: any = plainToClass(
                IntersectionType(this.schema, ClientCommonCondition),
                plain,
            );
            await validateOrReject(condition, {
                whitelist: true,
                stopAtFirstError: true,
            });
            const res = instanceToPlain(condition, {
                exposeUnsetFields: false,
            });
            return res;
        } catch (err) {
            throw new BadRequestException("Error parsing condition");
        }
    }
}

import {
    ArgumentMetadata,
    Paramtype,
    Type,
    ValidationPipe,
    ValidationPipeOptions,
} from "@nestjs/common";

export class AbstractValidationPipe extends ValidationPipe {
    constructor(
        options: ValidationPipeOptions,
        private readonly targetTypes: Partial<{
            [key in Paramtype]: Type<any>;
        }>,
    ) {
        super(options);
    }

    async transform(value: any, metadata: ArgumentMetadata) {
        const targetType = this.targetTypes[metadata.type];
        if (!targetType) {
            return super.transform(value, metadata);
        }
        const res = await super.transform(value, {
            ...metadata,
            metatype: targetType,
        });
        return res;
    }
}

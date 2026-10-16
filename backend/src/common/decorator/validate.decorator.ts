import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
} from "class-validator";
import moment from "moment";

export const IsYYYYMMDD = (validationOptions?: ValidationOptions) => {
    return (object: any, propertyName: string) => {
        registerDecorator({
            name: "isYYYYMMDD",
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: string) {
                    return (
                        typeof value === "string" &&
                        moment(value, "YYYY-MM-DD").isValid()
                    );
                },
                defaultMessage(args?: ValidationArguments) {
                    return `${args.property} must be YYYY-MM-DD`;
                },
            },
        });
    };
};

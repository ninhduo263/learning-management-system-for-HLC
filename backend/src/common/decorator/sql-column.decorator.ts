import { ModelAttributeColumnOptions } from "sequelize";
import { Column, Model } from "sequelize-typescript";

/**
 * Column cho DECIMAL / BIGINT: driver pg trả các kiểu này về dạng string,
 * decorator này đổi lại thành number khi đọc.
 */
export const NumberColumn =
    (options: Partial<ModelAttributeColumnOptions>): PropertyDecorator =>
    (target: object, propertyName: string) =>
        Column({
            ...options,
            get(this: Model) {
                const value = this.getDataValue(propertyName);
                return value === null || value === undefined
                    ? value
                    : Number(value);
            },
        })(target, propertyName);

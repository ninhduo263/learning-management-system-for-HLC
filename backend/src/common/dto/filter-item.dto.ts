import { ArrayEntityKeyOf, EntityKeyOf } from "@common/constant";
import { OperatorType } from "../constant/constant";

type CommonFilterItemDto<E = any> = {
    [K in keyof E]: {
        field?: keyof E | ArrayEntityKeyOf<E>;
        operator?: OperatorType;
        values?: Array<string | number | Date | boolean | symbol>;
        filters?: CommonFilterItemDto<EntityKeyOf<E>>[];
    };
}[keyof E];

export type FilterItemDto<E = any> =
    | CommonFilterItemDto<E>
    | CommonFilterItemDto;

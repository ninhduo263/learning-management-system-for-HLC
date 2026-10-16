import { EntityKeyOf } from "@common/constant";
import { QueryCondition } from "@module/repository/common/base-repository.interface";
import { FilterItemDto } from "./filter-item.dto";

type CommonPopulate<E = any> = {
    [K in keyof E]: {
        path: K;
        condition?: QueryCondition;
        /**
         * Nếu không có bản ghi populate thì không trả về bản ghi chính. Chỉ dùng cho SQL
         */
        required?: boolean;
        filter?: FilterItemDto<EntityKeyOf<E[K]>>[];
        fields?: { [field in keyof EntityKeyOf<E[K]>]: 0 | 1 };
        population?: CommonPopulate<EntityKeyOf<E[K]>>[];
        hasMany?: boolean;
    };
}[keyof E];

export type PopulationDto<E = any> = CommonPopulate<E> | CommonPopulate;

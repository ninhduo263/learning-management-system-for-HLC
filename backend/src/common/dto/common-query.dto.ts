import { EntityKeyOf } from "@common/constant";
import { FilterItemDto } from "./filter-item.dto";
import { PopulationDto } from "./population.dto";

export type CommonQueryDto<E = any> = {
    select?: { [K in keyof EntityKeyOf<E> | (string & {})]?: 0 | 1 };
    sort?: { [K in keyof EntityKeyOf<E> | (string & {})]?: -1 | 1 };
    filters?: FilterItemDto<E>[];
    page?: number;
    limit?: number;
    skip?: number;
    population?: PopulationDto<E>[];
    enableDataPartition?: boolean;
};

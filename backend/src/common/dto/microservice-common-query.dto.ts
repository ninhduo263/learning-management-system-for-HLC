import { BaseEntity } from "@common/interface/base-entity.interface";
import { CommonQueryDto } from "./common-query.dto";

export type MicroserviceCommonQueryDto<E extends BaseEntity> = {
    condition?: any;

    query: CommonQueryDto<E>;
};

import { RequestConditionPipe } from "@common/pipe/request-condition.pipe";
import { RequestQueryPipe } from "@common/pipe/request-query.pipe";
import { Query, Type } from "@nestjs/common";

export const RequestQuery = () => Query(RequestQueryPipe);
export const RequestCondition = (schema: Type<unknown>) =>
    Query("condition", new RequestConditionPipe(schema));

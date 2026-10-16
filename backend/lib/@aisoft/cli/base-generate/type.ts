import { getBaseInfo } from "./util";

export enum RepositoryType {
    MONGO = "mongo",
    SQL = "sql",
}

export type BaseInfo = ReturnType<typeof getBaseInfo>;

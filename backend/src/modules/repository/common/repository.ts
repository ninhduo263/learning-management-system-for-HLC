import { Inject, Provider, Type } from "@nestjs/common";

export const RepositoryProviderName = (name: string) => `${name}BaseRepository`;
export const RepositoryProvider = (
    name: string,
    repository: Type<any>,
): Provider => {
    return { provide: RepositoryProviderName(name), useClass: repository };
};
export const InjectRepository = (name: string) =>
    Inject(RepositoryProviderName(name));

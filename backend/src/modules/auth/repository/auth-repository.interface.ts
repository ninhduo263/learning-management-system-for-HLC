import { Auth } from "@module/auth/entities/auth.entity";
import { BaseRepository } from "@module/repository/common/base-repository.interface";

export type AuthRepository = BaseRepository<Auth>;

import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { User } from "../entities/user.entity";

export interface UserRepository extends BaseRepository<User> {
    getMe(user: User): Promise<User>;
}

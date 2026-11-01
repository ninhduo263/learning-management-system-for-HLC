import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { EventAccount } from "../entities/event-account.entity";

export interface EventAccountRepository extends BaseRepository<EventAccount> {
    // Có thể thêm các method custom nếu cần
    findByUsername(username: string): Promise<EventAccount | null>;
}

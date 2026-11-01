import { Entity } from "@module/repository";
import { InjectRepository } from "@module/repository/common/repository";
import { Injectable } from "@nestjs/common";
import { IncrementName } from "./common/constant";
import { IncrementRepository } from "./repository/increment-repository.interface";

@Injectable()
export class IncrementService {
    constructor(
        @InjectRepository(Entity.INCREMENT)
        private readonly incrementRepository: IncrementRepository,
    ) {}

    async getIncreaseCount(name: IncrementName) {
        const res = await this.incrementRepository.increase(name);
        return res.count;
    }
}

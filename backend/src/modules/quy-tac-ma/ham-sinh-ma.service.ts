import { Entity } from "@module/repository";
import { InjectRepository } from "@module/repository/common/repository";
import { HamSinhMaRepository } from "./repository/ham-sinh-ma-repository.interface";

export class HamSinhMaService {
    constructor(
        @InjectRepository(Entity.HAM_SINH_MA)
        private readonly hamSinhMaRepository: HamSinhMaRepository,
    ) {}
}

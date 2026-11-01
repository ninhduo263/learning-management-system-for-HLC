import { Test, TestingModule } from "@nestjs/testing";
import { QuyTacMaService } from "./quy-tac-ma.service";

describe("QuyTacMaService", () => {
    let service: QuyTacMaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [QuyTacMaService],
        }).compile();

        service = module.get<QuyTacMaService>(QuyTacMaService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});

import { Test, TestingModule } from "@nestjs/testing";
import { IncrementService } from "./increment.service";

describe("IncrementService", () => {
    let service: IncrementService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [IncrementService],
        }).compile();

        service = module.get<IncrementService>(IncrementService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});

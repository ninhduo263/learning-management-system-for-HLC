import { Test, TestingModule } from "@nestjs/testing";
import { DataProcessService } from "./data-process.service";

describe("DataProcessService", () => {
    let service: DataProcessService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [DataProcessService],
        }).compile();

        service = module.get<DataProcessService>(DataProcessService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});

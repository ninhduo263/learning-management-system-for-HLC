import { Test, TestingModule } from "@nestjs/testing";
import { CommonProviderService } from "./common-provider.service";

describe("CommonProviderService", () => {
    let service: CommonProviderService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [CommonProviderService],
        }).compile();

        service = module.get<CommonProviderService>(CommonProviderService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});

import { Test, TestingModule } from "@nestjs/testing";
import { OneSignalService } from "./one-signal.service";

describe("OneSignalService", () => {
    let service: OneSignalService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [OneSignalService],
        }).compile();

        service = module.get<OneSignalService>(OneSignalService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});

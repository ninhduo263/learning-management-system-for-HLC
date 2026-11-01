import { Test, TestingModule } from "@nestjs/testing";
import { OneSignalController } from "./one-signal.controller";

describe("OneSignalController", () => {
    let controller: OneSignalController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [OneSignalController],
        }).compile();

        controller = module.get<OneSignalController>(OneSignalController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});

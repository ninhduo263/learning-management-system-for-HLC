import { Test, TestingModule } from "@nestjs/testing";
import { SsoController } from "./sso.controller";

describe("SsoController", () => {
    let controller: SsoController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SsoController],
        }).compile();

        controller = module.get<SsoController>(SsoController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});

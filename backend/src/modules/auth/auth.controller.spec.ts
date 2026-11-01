import { Test, TestingModule } from "@nestjs/testing";
import { AuthPublicController } from "./auth-public.controller";

describe("AuthController", () => {
    let controller: AuthPublicController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthPublicController],
        }).compile();

        controller = module.get<AuthPublicController>(AuthPublicController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});

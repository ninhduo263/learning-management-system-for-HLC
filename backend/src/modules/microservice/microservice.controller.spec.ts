import { Test, TestingModule } from "@nestjs/testing";
import { MicroserviceController } from "./microservice.controller";

describe("MicroserviceController", () => {
    let controller: MicroserviceController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [MicroserviceController],
        }).compile();

        controller = module.get<MicroserviceController>(MicroserviceController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});

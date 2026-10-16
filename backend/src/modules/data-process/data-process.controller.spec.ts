import { Test, TestingModule } from "@nestjs/testing";
import { DataProcessController } from "./data-process.controller";

describe("DataProcessController", () => {
    let controller: DataProcessController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DataProcessController],
        }).compile();

        controller = module.get<DataProcessController>(DataProcessController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});

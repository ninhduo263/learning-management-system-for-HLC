import { Test, TestingModule } from "@nestjs/testing";
import { MinioController } from "./minio.controller";

describe("MinioController", () => {
    let controller: MinioController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [MinioController],
        }).compile();

        controller = module.get<MinioController>(MinioController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});

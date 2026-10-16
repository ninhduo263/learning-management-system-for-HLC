import { Test, TestingModule } from "@nestjs/testing";
import { DataPartitionController } from "./controllers/data-partition.controller";

describe("DataPartitionController", () => {
    let controller: DataPartitionController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DataPartitionController],
        }).compile();

        controller = module.get<DataPartitionController>(
            DataPartitionController,
        );
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});

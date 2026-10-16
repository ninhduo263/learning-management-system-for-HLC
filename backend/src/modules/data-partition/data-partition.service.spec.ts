import { Test, TestingModule } from "@nestjs/testing";
import { DataPartitionUserService } from "./services/data-partition-user.service";

describe("DataPartitionService", () => {
    let service: DataPartitionUserService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [DataPartitionUserService],
        }).compile();

        service = module.get<DataPartitionUserService>(
            DataPartitionUserService,
        );
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});

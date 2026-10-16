import { Test, TestingModule } from "@nestjs/testing";
import { MicroserviceService } from "./microservice.service";

describe("MicroserviceService", () => {
    let service: MicroserviceService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [MicroserviceService],
        }).compile();

        service = module.get<MicroserviceService>(MicroserviceService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});

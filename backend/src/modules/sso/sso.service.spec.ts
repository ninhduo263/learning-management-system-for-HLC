import { Test, TestingModule } from "@nestjs/testing";
import { SsoService } from "./sso.service";

describe("SsoService", () => {
    let service: SsoService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SsoService],
        }).compile();

        service = module.get<SsoService>(SsoService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});

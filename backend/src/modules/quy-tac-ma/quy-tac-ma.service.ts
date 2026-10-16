import { ApiError } from "@config/exception/api-error";
import { Entity } from "@module/repository";
import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { Injectable } from "@nestjs/common";
import { LoaiCauHinhMa } from "./common/constant";
import { GetMaDto } from "./dto/get-ma.dto";
import { HamSinhMaService } from "./ham-sinh-ma.service";
import { QuyTacMaRepository } from "./repository/quy-tac-ma-repository.interface";

@Injectable()
export class QuyTacMaService {
    private mapRepository: { [field: string]: BaseRepository<any> } = {};
    constructor(
        @InjectRepository(Entity.QUY_TAC_MA)
        private readonly quyTacMaRepository: QuyTacMaRepository,
        private readonly hamSinhMaService: HamSinhMaService,
    ) {}

    async getMa(dto: GetMaDto) {
        const { nguon, data } = dto;
        const quyTac = await this.quyTacMaRepository.getOne({
            nguon,
        });
        if (!quyTac) {
            throw ApiError.NotFound("error-quy-tac-not-found");
        }
        const ma = await Promise.all(
            quyTac.cauHinh.map(async (cauHinh) => {
                switch (cauHinh.loai) {
                    case LoaiCauHinhMa.THUOC_TINH: {
                        return data[cauHinh.thuocTinh];
                    }
                    case LoaiCauHinhMa.LIEN_KET: {
                        const repository =
                            this.mapRepository[cauHinh.nguonLienKet];
                        const record = await repository.getOne({
                            [cauHinh.khoaChinhLienKet]:
                                data[cauHinh.khoaNgoaiLienKet],
                        });
                        return record?.[cauHinh.thuocTinhLienKet];
                    }
                    case LoaiCauHinhMa.HAM_SINH: {
                        const hamSinh: (data: unknown) => Promise<unknown> =
                            this.hamSinhMaService[cauHinh.hamSinh];
                        return hamSinh(data);
                    }
                }
            }),
        );
        return ma.join("");
    }
}

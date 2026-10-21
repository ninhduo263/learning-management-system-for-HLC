import { Controller, Get } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

/** Mở nhầm địa chỉ backend trên trình duyệt thì chỉ dẫn sang giao diện web và tài liệu API */
@Controller()
@ApiExcludeController()
export class RootController {
    @Get()
    getInfo() {
        return {
            service: "HLC LMS backend (API)",
            message:
                "Đây là địa chỉ API, không có giao diện. Mở giao diện web tại địa chỉ frontend.",
            frontend: process.env.FRONTEND_URL || "http://localhost:3000",
            docs: "/api",
        };
    }
}

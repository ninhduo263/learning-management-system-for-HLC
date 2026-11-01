import {
    Controller,
    Post,
    Body,
    Logger,
    HttpException,
    HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ConnectionManagerService } from "./services/connection-manager.service";
import { DeviceRegistrationDto } from "./dto/device-registration.dto";
import { CCCDDataDto } from "./dto/cccd-data.dto";
import { IdReaderRequestDto } from "./dto/id-reader-request.dto";

@ApiTags("WebSocket")
@Controller("websocket")
export class WebSocketController {
    private readonly logger = new Logger(WebSocketController.name);

    constructor(private readonly connectionManager: ConnectionManagerService) {}

    @Post("register-device")
    @ApiOperation({ summary: "Đăng ký thiết bị với kiosk" })
    @ApiResponse({ status: 200, description: "Đăng ký thành công" })
    async registerDevice(@Body() request: DeviceRegistrationDto) {
        try {
            this.connectionManager.registerDevice(
                request.kiosk_id,
                request.device_id,
            );

            this.logger.log(
                `Đã đăng ký thiết bị ${request.device_id} với kiosk ${request.kiosk_id}`,
            );

            return {
                success: true,
                message: `Đã đăng ký thiết bị ${request.device_id} với kiosk ${request.kiosk_id}`,
            };
        } catch (error) {
            this.logger.error(`Lỗi khi đăng ký thiết bị: ${error}`);
            throw new HttpException(
                {
                    success: false,
                    message: "Lỗi khi đăng ký thiết bị",
                    error: error.message,
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Post("cccd-reader")
    @ApiOperation({ summary: "Nhận dữ liệu từ máy quét CCCD" })
    @ApiResponse({ status: 200, description: "Gửi dữ liệu thành công" })
    async cccdReader(@Body() cccdData: CCCDDataDto) {
        try {
            const deviceId = cccdData.device_id;
            this.logger.log(`Received CCCD data from device: ${deviceId}`);

            // Tìm kiosk được ánh xạ với device_id này
            const kioskId = this.connectionManager.getKioskForDevice(deviceId);

            if (!kioskId) {
                this.logger.warn(`No kiosk mapped for device: ${deviceId}`);
                return {
                    success: false,
                    message:
                        "Không tìm thấy kiosk được ánh xạ với thiết bị này",
                };
            }

            // Gửi dữ liệu CCCD đến kiosk tương ứng qua WebSocket
            await this.connectionManager.sendJson(
                {
                    success: true,
                    event: "cccd",
                    payload: {
                        "Identity Code": cccdData.identity_code,
                        Name: cccdData.name,
                        DOB: cccdData.dob,
                        Gender: cccdData.gender,
                        device_id: deviceId,
                    },
                },
                kioskId,
            );

            return {
                success: true,
                message: `Đã gửi dữ liệu thành công tới kiosk ${kioskId}`,
            };
        } catch (error) {
            this.logger.error(`Error processing CCCD data: ${error}`);
            throw new HttpException(
                {
                    success: false,
                    message: "Lỗi xử lý dữ liệu CCCD",
                    error: error.message,
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Post("api/face-recognition/IdReader")
    @ApiOperation({ summary: "Nhận dữ liệu nhận diện từ ID Reader" })
    @ApiResponse({ status: 200, description: "Gửi dữ liệu thành công" })
    async getIdentity(@Body() request: IdReaderRequestDto) {
        try {
            this.logger.log(`Received IdReader data:`, request);

            const { identity_code, name, dob, gender, device_id } = request;

            if (!identity_code) {
                this.logger.warn("Missing Identity Code in request");
            }

            // Gửi dữ liệu đến kiosk
            await this.connectionManager.sendResponse(
                {
                    success: true,
                    event: "cccd",
                    payload: {
                        "Identity Code": identity_code,
                        Name: name,
                        DOB: dob,
                        Gender: gender,
                    },
                    error: null,
                },
                device_id,
            );

            this.logger.log(
                `Data sent: ${identity_code}, ${name}, ${dob}, ${device_id}`,
            );

            return {
                success: true,
                message: "Đã gửi dữ liệu thành công",
                error: null,
            };
        } catch (error) {
            this.logger.error(`Error processing IdReader data: ${error}`);
            throw new HttpException(
                {
                    success: false,
                    message: "Lỗi xử lý dữ liệu IdReader",
                    error: error.message,
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Post("api/face-recognition/IdReader-checkin")
    @ApiOperation({ summary: "Nhận dữ liệu check-in từ ID Reader" })
    @ApiResponse({ status: 200, description: "Gửi dữ liệu thành công" })
    async getIdentityCheckin(@Body() request: IdReaderRequestDto) {
        try {
            this.logger.log(`Received IdReader checkin data:`, request);

            const { identity_code, name, dob, gender, device_id } = request;

            if (!identity_code) {
                this.logger.warn("Missing Identity Code in request");
            }

            // TODO: Gọi API check-in/out từ EventLogModule
            // const response = await this.eventLogService.checkInOut({
            //   identityCode: identity_code,
            //   name,
            //   dob,
            //   gender,
            // });

            // Tạm thời mock response
            const mockResponse = {
                payload: {
                    isCheckedIn: true,
                    isCheckedOut: false,
                    status: "checked_in",
                    checkInTime: new Date().toISOString(),
                    checkOutTime: null,
                },
            };

            // Gửi dữ liệu đến kiosk
            await this.connectionManager.sendResponse(
                {
                    success: true,
                    event: "cccd-checkin",
                    payload: {
                        "Identity Code": identity_code,
                        Name: name,
                        DOB: dob,
                        Gender: gender,
                        isCheckedIn: mockResponse.payload.isCheckedIn,
                        isCheckedOut: mockResponse.payload.isCheckedOut,
                        status: mockResponse.payload.status,
                        checkInTime: mockResponse.payload.checkInTime,
                        checkOutTime: mockResponse.payload.checkOutTime,
                    },
                    error: null,
                },
                device_id,
            );

            this.logger.log(
                `Checkin data sent: ${identity_code}, ${name}, ${dob}, ${device_id}`,
            );

            return {
                success: true,
                message: "Đã gửi dữ liệu thành công",
                error: null,
            };
        } catch (error) {
            this.logger.error(
                `Error processing IdReader checkin data: ${error}`,
            );
            throw new HttpException(
                {
                    success: false,
                    message: "Lỗi xử lý dữ liệu IdReader checkin",
                    error: error.message,
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}

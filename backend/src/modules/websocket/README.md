# WebSocket Module

Module WebSocket cho ứng dụng NestJS, chuyển đổi từ FastAPI WebSocket implementation.

## Tính năng

- **WebSocket Gateway**: Xử lý kết nối WebSocket real-time
- **Connection Manager**: Quản lý kết nối và ánh xạ device-kiosk
- **REST API Endpoints**: Các endpoint tương tự FastAPI
- **Type Safety**: Sử dụng TypeScript và validation
- **Swagger Documentation**: API documentation tự động

## Cấu trúc

```
src/modules/websocket/
├── dto/                              # Data Transfer Objects
│   ├── cccd-data.dto.ts             # DTO cho dữ liệu CCCD
│   ├── device-registration.dto.ts    # DTO cho đăng ký thiết bị
│   ├── id-reader-request.dto.ts     # DTO cho ID Reader
│   └── index.ts                     # Export DTOs
├── services/
│   └── connection-manager.service.ts # Service quản lý kết nối
├── websocket.gateway.ts             # WebSocket Gateway
├── websocket.controller.ts          # REST API Controller
├── websocket.module.ts              # Module definition
├── index.ts                         # Export module
└── README.md                        # Documentation
```

## Cách sử dụng

### 1. Kết nối WebSocket từ Client

```javascript
const socket = io('http://localhost:3000');

// Đăng ký kiosk
socket.emit('register_kiosk', { kiosk_id: 'kiosk_001' });

// Hoặc đăng ký với device_id
socket.emit('device_id', 'device_001');

// Lắng nghe events
socket.on('cccd', (data) => {
  console.log('Received CCCD data:', data);
});

socket.on('cccd-checkin', (data) => {
  console.log('Received checkin data:', data);
});

socket.on('webcam_result', (data) => {
  console.log('Webcam result:', data);
});

// Gửi dữ liệu webcam
socket.emit('webcam_data', { image: 'base64_data' });

// Ping test
socket.emit('ping', {});
socket.on('pong', (data) => {
  console.log('Pong received:', data);
});
```

### 2. REST API Endpoints

#### Đăng ký thiết bị
```bash
POST /websocket/register-device
Content-Type: application/json

{
  "device_id": "device_001",
  "kiosk_id": "kiosk_001"
}
```

#### Gửi dữ liệu CCCD
```bash
POST /websocket/cccd-reader
Content-Type: application/json

{
  "device_id": "device_001",
  "identity_code": "123456789",
  "name": "Nguyen Van A",
  "dob": "1990-01-01",
  "gender": "Nam"
}
```

#### ID Reader
```bash
POST /websocket/api/face-recognition/IdReader
Content-Type: application/json

{
  "identity_code": "123456789",
  "name": "Nguyen Van A",
  "dob": "1990-01-01",
  "gender": "Nam",
  "device_id": "device_001"
}
```

#### ID Reader Check-in
```bash
POST /websocket/api/face-recognition/IdReader-checkin
Content-Type: application/json

{
  "identity_code": "123456789",
  "name": "Nguyen Van A",
  "dob": "1990-01-01",
  "gender": "Nam",
  "device_id": "device_001"
}
```

### 3. WebSocket Events

#### Client → Server
- `register_kiosk`: Đăng ký kiosk
- `device_id`: Đăng ký device
- `webcam_data`: Gửi dữ liệu webcam
- `ping`: Ping test

#### Server → Client
- `connection`: Thông báo kết nối thành công
- `kiosk_registered`: Xác nhận đăng ký kiosk
- `device_registered`: Xác nhận đăng ký device
- `cccd`: Dữ liệu CCCD
- `cccd-checkin`: Dữ liệu check-in
- `webcam_result`: Kết quả xử lý webcam
- `pong`: Pong response
- `error`: Thông báo lỗi

## Tích hợp với EventLog

Để tích hợp với EventLogModule cho chức năng check-in/out, uncomment và sử dụng:

```typescript
// Trong websocket.controller.ts
constructor(
  private readonly connectionManager: ConnectionManagerService,
  private readonly eventLogService: EventLogService, // Thêm service này
) {}

// Trong getIdentityCheckin method
const response = await this.eventLogService.checkInOut({
  identityCode: identity_code,
  name,
  dob,
  gender,
});
```

## Swagger Documentation

Truy cập `/api` để xem API documentation với Swagger UI.

## Logging

Module sử dụng NestJS Logger để ghi log:
- Kết nối/ngắt kết nối WebSocket
- Đăng ký thiết bị/kiosk
- Gửi/nhận dữ liệu
- Lỗi xử lý

## Lưu ý

- Module này thay thế hoàn toàn FastAPI WebSocket implementation
- Hỗ trợ CORS cho tất cả origins (có thể cấu hình lại)
- Sử dụng Socket.IO cho WebSocket communication
- Tích hợp với NestJS dependency injection
- Type-safe với TypeScript 
# HLC Mentoring System

Hệ thống quản lý mentoring và học tập cho HLC, gồm:

- Backend Node.js, Express và MongoDB/Mongoose.
- Frontend Next.js App Router, TypeScript, Ant Design và TailwindCSS.
- Quản lý chu kỳ/quý, ghép cặp Mentor/Mentee, lịch mentoring và recap.
- Import dữ liệu nhân sự từ Excel/CSV.
- Tính điểm, phụ cấp, báo cáo và xuất dữ liệu.
- Upload minh chứng qua Cloudinary.

## Chạy nhanh bằng Docker (frontend + backend + PostgreSQL + Redis)

Yêu cầu: Docker và Docker Compose v2.

```bash
cp .env.example .env        # (tùy chọn) đổi mật khẩu, JWT secret, cổng
docker compose up -d --build
```

| Thành phần | Địa chỉ |
|---|---|
| Frontend (`hlc-mentoring-web/`) | http://localhost:3000 |
| Backend NestJS (`backend/`) | http://localhost:5000 |
| Swagger | http://localhost:5000/api |

- Tài khoản admin mặc định: `admin` / `admin` (đổi bằng `ADMIN_PASSWORD` trước lần chạy đầu).
- Bắt đầu sử dụng:
  1. Vào **Dashboard → Import Excel thành viên**.
  2. Bấm **Tạo tài khoản**. Thành viên đăng nhập bằng mã viết thường (`hlc-mte-00001`), mật khẩu là ngày sinh `ddmmyyyy`.
- Dữ liệu nằm trong volume `postgres-data`. Xóa sạch dữ liệu: `docker compose down -v`.
- Xem log: `docker compose logs -f backend`. Dừng hệ thống: `docker compose down`.
- Cổng 3000/5000 đã bị dùng thì đổi `FE_PORT`, `BE_PORT` và `PUBLIC_API_URL` trong `.env`.
- Deploy lên server/domain: đặt `PUBLIC_API_URL` là địa chỉ backend mà trình duyệt truy cập được (ví dụ `https://api.hlc.vn`), rồi chạy lại `docker compose up -d --build`. Địa chỉ này được nhúng vào frontend lúc build.
- **Lưu ý:**
  - Backend đang chạy với `SERVER_ENV=development`, để Sequelize tự tạo bảng vì dự án **chưa có migration**. Ở chế độ này, response lỗi có kèm chi tiết debug.
  - Trước khi đưa vào sử dụng thật, cần làm migration từ `backend/docs/database/schema.sql` rồi chuyển sang `production`.

## Cấu trúc dự án

Hệ thống được chia thành 2 phần chính:

```text
hlc-mentoring-backend/   
├── controllers/         # Logic xử lý HTTP request (Mentoring, Users, Auth, v.v.)
├── models/              # Lược đồ cơ sở dữ liệu MongoDB (Mongoose Schema)
├── routes/              # Định tuyến API
├── services/            # Logic nghiệp vụ chung (Tính điểm, phần thưởng)
├── middlewares/         # Middleware phân quyền (Auth, Roles)
└── utils/               # Các hàm tiện ích (Thời gian, thuật toán ghép cặp)

hlc-mentoring-web/       
├── src/app/             # Next.js App Router (Các trang giao diện)
├── src/components/      # React Components dùng chung
└── src/lib/             # Cấu hình API Fetch và Utilities
```

## Yêu cầu hệ thống

- Node.js 20 trở lên.
- MongoDB (Local hoặc MongoDB Atlas).
- Tài khoản Cloudinary (để upload ảnh/minh chứng).

## Hướng dẫn chạy môi trường Development (Local)

### 1. Backend

```powershell
cd hlc-mentoring-backend
npm install
Copy-Item .env.example .env
npm start
```
*Lưu ý: Bạn cần điền các thông tin kết nối MongoDB và Cloudinary vào file `.env`.*
Backend mặc định chạy tại `http://localhost:5000`.

### 2. Frontend

```powershell
cd hlc-mentoring-web
npm install
npm run dev
```
Frontend mặc định chạy tại `http://localhost:3000`. Cấu hình API có thể được ghi đè thông qua biến môi trường `NEXT_PUBLIC_API_URL` trong file `.env.local`.

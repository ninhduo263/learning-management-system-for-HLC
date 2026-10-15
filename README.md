# HLC Mentoring System

Hệ thống quản lý mentoring và học tập cho HLC, gồm:

- Backend Node.js, Express và MongoDB/Mongoose.
- Frontend Next.js App Router, TypeScript, Ant Design và TailwindCSS.
- Quản lý chu kỳ/quý, ghép cặp Mentor/Mentee, lịch mentoring và recap.
- Import dữ liệu nhân sự từ Excel/CSV.
- Tính điểm, phụ cấp, báo cáo và xuất dữ liệu.
- Upload minh chứng qua Cloudinary.

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

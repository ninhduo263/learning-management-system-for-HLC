# HLC Mentoring System

Hệ thống quản lý mentoring và học tập cho HLC, gồm:

- Backend Node.js, Express và MongoDB/Mongoose.
- Frontend Next.js App Router, TypeScript, Ant Design và TailwindCSS.
- Quản lý chu kỳ/quý, ghép cặp Mentor/Mentee, lịch mentoring và recap.
- Import dữ liệu nhân sự từ Excel/CSV.
- Tính điểm, phụ cấp, báo cáo và xuất dữ liệu.
- Upload minh chứng qua Cloudinary.

## Cấu trúc

```text
hlc-mentoring-backend/   # Express API, Mongoose models, import/migration scripts
hlc-mentoring-web/       # Next.js frontend
```

## Yêu cầu

- Node.js 20 trở lên.
- MongoDB.
- Tài khoản Cloudinary nếu sử dụng upload ảnh.

## Chạy backend

```powershell
cd hlc-mentoring-backend
Copy-Item .env.example .env
npm install
npm start
```

Điền các biến môi trường trong `.env` trước khi chạy. Không commit `.env`.

Backend mặc định chạy tại `http://localhost:5000`.

## Chạy frontend

```powershell
cd hlc-mentoring-web
npm install
npm run dev
```

Frontend mặc định chạy tại `http://localhost:3000`.

Tạo `.env.local` và cấu hình các biến `NEXT_PUBLIC_*` cần thiết cho môi trường của bạn. Không commit file môi trường thật.

## Kiểm tra

```powershell
cd hlc-mentoring-backend
node --check index.js

cd ..\hlc-mentoring-web
npm run build
```

## Bảo mật

- Không commit MongoDB URI, JWT secret, bootstrap key, Cloudinary secret hoặc mật khẩu.
- Mật khẩu người dùng được lưu dưới dạng bcrypt hash.
- Endpoint quản trị yêu cầu JWT và role `ADMIN`.
- File Excel chứa dữ liệu cá nhân không nên đưa vào repository.

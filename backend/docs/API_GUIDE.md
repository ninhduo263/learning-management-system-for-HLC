# Hướng dẫn gọi API backend HLC LMS (dành cho Frontend)

Tài liệu mô tả cách gọi API của `backend/` (NestJS + PostgreSQL): xác thực, định dạng request/response, cách lọc/phân trang, phân quyền, upload file, và đầu vào/đầu ra của từng resource.

> Mọi ví dụ response trong tài liệu được lấy từ lần chạy thật backend ngày 21/10/2026. Riêng giá trị `_id` và token đã được rút gọn.
>
> Swagger UI (thử API trực tiếp): **`{BASE_URL}/api`**. Swagger luôn khớp code hiện tại, nên khi có chênh lệch thì tin Swagger.

---

## Mục lục

1. [Thông tin chung](#1-thông-tin-chung)
2. [Xác thực](#2-xác-thực)
3. [Định dạng response và lỗi](#3-định-dạng-response-và-lỗi)
4. [Phân quyền](#4-phân-quyền)
5. [Mẫu CRUD chung của mọi resource](#5-mẫu-crud-chung-của-mọi-resource)
6. [Lọc, sắp xếp, phân trang](#6-lọc-sắp-xếp-phân-trang)
7. [Quy ước kiểu dữ liệu](#7-quy-ước-kiểu-dữ-liệu)
8. [Upload file và đính kèm](#8-upload-file-và-đính-kèm)
9. [Xuất / nhập Excel](#9-xuất--nhập-excel)
10. [API nghiệp vụ mentoring](#10-api-nghiệp-vụ-mentoring)
11. [API điểm phụ cấp, HLC Fund, học tập, phân quyền, dashboard](#11-api-điểm-phụ-cấp-hlc-fund-học-tập-phân-quyền-dashboard)
12. [Danh mục resource](#12-danh-mục-resource)
13. [Chi tiết trường của từng resource](#13-chi-tiết-trường-của-từng-resource)
14. [Lưu ý nghiệp vụ và giới hạn hiện tại](#14-lưu-ý-nghiệp-vụ-và-giới-hạn-hiện-tại)
15. [Code mẫu (TypeScript + axios)](#15-code-mẫu-typescript--axios)

---

## 1. Thông tin chung

| Mục | Giá trị |
|---|---|
| Base URL (dev) | `http://localhost:5000` (theo biến `SERVER_PORT` của backend; frontend Next.js chạy ở cổng 3000) |
| Prefix | **Không có** prefix `/api`. Ví dụ: `GET http://localhost:3000/member/page` |
| Định dạng | JSON (`Content-Type: application/json`), trừ upload file (`multipart/form-data`) và tải Excel (file nhị phân) |
| CORS | Đã bật cho mọi origin |
| Xác thực | `Authorization: Bearer <accessToken>` cho mọi route, trừ `/auth/login`, `/auth/refresh`, `/auth/logout` và route tải file |
| Múi giờ | Server trả thời gian dạng ISO UTC (`...Z`). FE tự đổi sang `Asia/Ho_Chi_Minh` khi hiển thị |

---

## 2. Xác thực

### 2.1 Đăng nhập: `POST /auth/login`

Request:
```json
{ "username": "admin", "password": "admin", "platform": "Web" }
```
| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `username` | string | ✔ | **Phân biệt hoa thường** (`ADMIN` ≠ `admin`). Nên trim và đổi về chữ thường trước khi gửi |
| `password` | string | ✔ | |
| `platform` | enum | ✔ | `Web` \| `Mobile` |

Response `200`:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "accessExpireAt": 1792561959,
    "refreshExpireAt": 1792644759
  }
}
```
- `accessExpireAt` và `refreshExpireAt` là **Unix timestamp tính bằng giây** (không phải mili giây).
- Thời hạn token do backend cấu hình (`JWT_EXP`, `JWT_REFRESH_EXP`). Ví dụ ở môi trường test: access token 1 giờ, refresh token 1 ngày.
- Phần payload của access token (giải mã base64, không cần secret) có `sub` (= `_id` của user), `username`, `email` và **`systemRole`**. FE có thể đọc `systemRole` để dựng menu, nhưng muốn có đủ thông tin thì nên gọi `GET /user/me`.

Sai tài khoản/mật khẩu → `401`:
```json
{ "success": false, "code": "error-unauthorized", "status": 401, "message": "Xác thực không hợp lệ" }
```

### 2.2 Làm mới token: `POST /auth/refresh`
```json
{ "refreshToken": "eyJhbGciOi..." }
```
Response giống hệt login. Khi một request nhận `401`, FE gọi refresh một lần rồi gửi lại request; nếu refresh cũng `401` thì chuyển về màn đăng nhập (xem code mẫu ở mục 15).

### 2.3 Đăng xuất: `POST /auth/logout`
```json
{ "refreshToken": "eyJhbGciOi..." }
```
Thu hồi refresh token đó. FE xóa token đang lưu.

### 2.4 Tài khoản hiện tại

| Route | Ai gọi được | Mô tả |
|---|---|---|
| `GET /user/me` | Mọi tài khoản đã đăng nhập | Thông tin user hiện tại (không bao giờ có `password`) |
| `PUT /user/me/password` | Mọi tài khoản đã đăng nhập | Đổi mật khẩu của chính mình |
| `GET /member/me` | Mọi tài khoản đã đăng nhập | Hồ sơ thành viên gắn với tài khoản (`memberCode`, `fullName`…), `null` nếu chưa liên kết. Dùng để lấy mã HLC sau khi đăng nhập |

`GET /user/me` → `200`:
```json
{
  "success": true,
  "data": {
    "_id": "6ad8…",
    "username": "hlc-mte-00001",
    "email": "mte1@hlc.vn",
    "fullname": "Mentee 1",
    "firstname": null, "lastname": null, "gender": null, "dob": null, "ssoId": null,
    "systemRole": "Mentee",
    "dataPartitionCode": null,
    "createdAt": "2026-10-21T04:00:00.000Z",
    "updatedAt": "2026-10-21T04:00:00.000Z"
  }
}
```

`PUT /user/me/password`:
```json
{ "oldPass": "Mentee@123", "newPass": "New@12345" }
```
| Trường hợp | Kết quả |
|---|---|
| Thành công | `200`, trả về user (không có password) |
| Sai mật khẩu cũ | `400` `error-old-password-wrong` "Mật khẩu cũ không chính xác" |
| Mật khẩu mới trùng mật khẩu cũ | `400` `error-duplicate-new-password` "Mật khẩu mới phải khác mật khẩu cũ" |

### 2.5 Quản lý tài khoản (chỉ Admin tổng): `/user`

Dùng mẫu CRUD chung ở mục 5, với `{resource}` = `user`. Các trường của user:

| Trường | Kiểu | Bắt buộc khi tạo | Ghi chú |
|---|---|---|---|
| `username` | string | ✔ | Unique, phân biệt hoa thường. Quy ước: mã thành viên viết thường, ví dụ `hlc-mte-00001` |
| `password` | string | | Server tự băm. **Không bao giờ được trả về** trong response |
| `email` | string (email) | ✔ | |
| `systemRole` | enum | ✔ | `Admin` (admin tổng) \| `Mentor` \| `Mentee` \| `User` |
| `fullname`, `firstname`, `lastname` | string | | |
| `gender` | enum | | `Male` \| `Female` |
| `dob` | date `YYYY-MM-DD` | | |
| `ssoId` | string | | |

Sau khi tạo tài khoản cho mentee/mentor, gán `_id` của user vào `Member.userId` để liên kết tài khoản với hồ sơ thành viên.

---

## 3. Định dạng response và lỗi

### 3.1 Thành công
Mọi response thành công đều có HTTP `200` (kể cả khi tạo mới) và có dạng:
```json
{ "success": true, "data": <kết quả> }
```

### 3.2 Lỗi
```json
{ "success": false, "code": "error-record-not-found", "status": 404, "message": "Không tìm thấy bản ghi" }
```
- `status`: trùng với HTTP status.
- `code`: mã lỗi ổn định để FE rẽ nhánh. Một số lỗi không có `code`, ví dụ lỗi validate hoặc 401 khi thiếu token.
- `message`: thông báo tiếng Việt, hiển thị được cho người dùng. Gửi `?lang=en` hoặc header `Accept-Language: en` để nhận tiếng Anh.
- `detail`: **chỉ có ở môi trường dev**, gồm stack và chi tiết lỗi. Không được dựa vào trường này.

| HTTP | `code` | Khi nào |
|---|---|---|
| 400 | *(không có)* `message: "Bad Request Exception"` | Body sai kiểu, sai enum hoặc thiếu trường bắt buộc (xem lưu ý bên dưới) |
| 400 | *(không có)* `message: "Error parsing condition"` / `"Error parsing client query"` | `condition`, `sort`, `filters` không phải JSON hợp lệ hoặc dùng sai (mục 6) |
| 400 | `error-record-invalid` | Dữ liệu bị DB từ chối, ví dụ gửi `null` vào trường bắt buộc |
| 400 | `error-record-reference-invalid` | Id liên kết không tồn tại (khi DB đã có ràng buộc khóa ngoại, sau khi chạy migration) |
| 400 | `error-old-password-wrong`, `error-duplicate-new-password` | Đổi mật khẩu |
| 401 | `error-unauthorized` hoặc *(không có)* `message: "Unauthorized"` | Thiếu token, token hết hạn, hoặc sai mật khẩu khi đăng nhập |
| 403 | `error-forbidden` "Không có quyền truy cập" | Đúng token nhưng không đủ quyền (mục 4) |
| 404 | `error-record-not-found` "Không tìm thấy bản ghi" | `GET/PUT/DELETE /{resource}/:id` với id không tồn tại, hoặc `GET /one` không có kết quả |
| 404 | *(không có)* `message: "Cannot POST /point-entry"` | Route không tồn tại, ví dụ ghi vào resource chỉ đọc |
| 409 | `error-record-duplicate` "Dữ liệu bị trùng với bản ghi đã có" | Trùng giá trị unique, ví dụ `memberCode` |
| 500 | *(không có)* | Lỗi server. Báo cho backend |

> **Lưu ý về lỗi validate (400):** response **không có danh sách lỗi theo từng trường** (danh sách đó chỉ có trong `detail` ở môi trường dev). FE nên tự validate form theo bảng trường ở mục 13 (bắt buộc, độ dài, enum, định dạng ngày) trước khi gửi.
>
> Ví dụ ở môi trường dev, `detail.exception.response.message` sẽ là
> `["memberType must be one of the following values: MENTEE, MENTOR", "fullName must be a string"]`.

---

## 4. Phân quyền

### 4.1 Vai trò (`systemRole` của tài khoản)

| Role | Ý nghĩa |
|---|---|
| `Admin` | **Admin tổng**: dùng được mọi API |
| `Mentor`, `Mentee` | Thành viên |
| `User` | Tài khoản chung (ví dụ đăng nhập qua SSO) |

### 4.2 Admin theo phạm vi (bảng `admin-permission`)
Admin tổng cấp thêm quyền cho một tài khoản bất kỳ, kể cả mentee, bằng `POST /access/permissions` (mục 11.6) hoặc CRUD `POST /admin-permission`. Có hiệu lực ngay ở request tiếp theo, không cần đăng nhập lại.

| `scope` | Người có quyền được dùng | Ghi chú |
|---|---|---|
| `FUND` | `/fund/contributions…`, `/fund/stats` (mục 11.4), CRUD `fund-contribution` | Duyệt minh chứng quỹ |
| `MENTORING` | `mentoring-quarter`, `mentor-preference`, `mentor-preference-item`, `mentoring-pair`, `mentoring-session`, `mentoring-schedule-log`, `mentoring-recap`, `mentoring-award` | |
| `POINT` | `/points/periods…`, `/points/adjustments…` (mục 11.2), CRUD `point-type`, `point-rule`, `point-adjustment`, `point-entry`, `allowance-summary`, `period-export` | |
| `LEARNING_MODULE` | API quản lý `/learning/modules…`, `/learning/submissions/{id}/review`, thư viện (mục 11.5) | Chỉ với module ghi trong `moduleId` |

### 4.3 Bảng quyền hiện tại

| Nhóm API | Admin tổng | Có scope tương ứng | Mentor / Mentee thường |
|---|---|---|---|
| `/auth/*`, `GET /user/me`, `PUT /user/me/password` | ✔ | ✔ | ✔ |
| Upload `POST /file`, tải file | ✔ | ✔ | ✔ |
| Mentoring của chính mình (`/mentoring/me`, gửi lịch, recap, nguyện vọng; mục 10.3) | — | — | ✔ |
| Mentoring nghiệp vụ admin (`/mentoring/quarters/...`, mục 10.2) | ✔ | ✔ (`MENTORING`) | ✘ |
| Của chính mình: `/points/me`, `/fund/me…`, `/learning/me`, nộp bài, `/dashboard/me` (mục 11) | — | — | ✔ |
| `/access/me`, `GET /learning/library` | ✔ | ✔ | ✔ |
| `/dashboard/admin`, `/access/permissions` | ✔ | ✘ | ✘ |
| `/user`, `/admin-permission` | ✔ | ✘ | ✘ |
| Thành viên, ban/chức vụ, kỳ, đính kèm, học tập | ✔ | ✘ | ✘ |
| Quỹ / mentoring / điểm | ✔ | ✔ (đúng scope) | ✘ |

Không đủ quyền → `403 error-forbidden`. FE nên ẩn menu theo `systemRole` và danh sách quyền. Admin tổng xem quyền của một người bằng: `GET /admin-permission/many?condition={"userId":"<id>"}`.

> Mentor/mentee có API riêng cho mentoring (mục 10.3), điểm, quỹ, học tập và dashboard (mục 11).

---

## 5. Mẫu CRUD chung của mọi resource

Mọi resource ở mục 12 dùng chung bộ route dưới đây (thay `{resource}` bằng tên route, ví dụ `member`). Resource **chỉ đọc** chỉ có các route đánh dấu 📖.

| Method | Path | Body | `data` trả về |
|---|---|---|---|
| `POST` | `/{resource}` | Đối tượng mới (các trường ở mục 13, **không gửi `_id`**) | Bản ghi vừa tạo |
| `GET` 📖 | `/{resource}/page` | — | `{ page, skip, limit, total, result: [...] }` |
| `GET` 📖 | `/{resource}/many` | — | Mảng bản ghi (không phân trang) |
| `GET` 📖 | `/{resource}/one` | — | Bản ghi đầu tiên khớp điều kiện, hoặc `404` |
| `GET` 📖 | `/{resource}/:id` | — | 1 bản ghi, hoặc `404` |
| `PUT` | `/{resource}/:id` | Các trường muốn sửa (**sửa một phần**, trường không gửi giữ nguyên) | Bản ghi sau khi sửa |
| `PUT` | `/{resource}/many/ids` | `{ "ids": ["…","…"], "update": { …trường cần sửa… } }` | `{ "n": 2, "affected": 2 }` |
| `DELETE` | `/{resource}/:id` | — | Bản ghi vừa xóa |
| `DELETE` | `/{resource}/many/ids` | `{ "ids": ["…","…"] }` | `{ "n": 1, "deleted": 1 }` |
| `GET` 📖 | `/{resource}/export/definition` | — | Danh sách cột xuất Excel được (mục 9) |
| `POST` 📖 | `/{resource}/export/xlsx` | `{ "definitions": [...] }` | **File `.xlsx`** (không bọc JSON) |

Chỉ resource có import (`member`, `library-item`) mới có thêm: `GET /{resource}/import/definition`, `GET /{resource}/import/template/xlsx`, `POST /{resource}/import/validate`, `POST /{resource}/import/insert` (mục 9).

Ví dụ tạo thành viên: `POST /member`
```json
{ "memberCode": "HLC-MTE-00001", "memberType": "MENTEE", "fullName": "Nguyễn Văn An", "phone": "09000000001", "joinedAt": "2026-09-01" }
```
Response:
```json
{
  "success": true,
  "data": {
    "_id": "6ad84517d881385fc6cc054d",
    "status": "ACTIVE",
    "memberCode": "HLC-MTE-00001",
    "memberType": "MENTEE",
    "fullName": "Nguyễn Văn An",
    "phone": "09000000001",
    "joinedAt": "2026-09-01",
    "userId": null, "dateOfBirth": null, "gender": null, "email": null, "profileUrl": null,
    "bankAccount": null, "bankName": null, "livingAllowanceType": null, "allowanceStartDate": null, "note": null,
    "createdAt": "2026-10-21T04:52:39.303Z",
    "updatedAt": "2026-10-21T04:52:39.303Z"
  }
}
```
- Trường không gửi sẽ nhận giá trị mặc định (ví dụ `status: "ACTIVE"`) hoặc `null`.
- **Trường lạ bị bỏ qua**, không báo lỗi: server chỉ giữ các trường có trong mục 13.

---

## 6. Lọc, sắp xếp, phân trang

Áp dụng cho `GET /page`, `GET /many`, `GET /one` (`POST /export/xlsx` cũng nhận cùng bộ tham số trên URL). Mọi tham số nằm trên **query string** và phải **URL-encode**. Giá trị dạng JSON (`condition`, `sort`, `filters`) cần `JSON.stringify` trước khi encode.

| Tham số | Dạng | Ví dụ | Ghi chú |
|---|---|---|---|
| `page` | số, bắt đầu từ 1 | `page=1` | Dùng kèm `limit` |
| `limit` | số | `limit=20` | Không truyền `page`/`limit` thì `/page` trả **toàn bộ** và không có `page`/`limit` trong kết quả |
| `skip` | số | `skip=40` | Thay cho `page` nếu muốn |
| `sort` | JSON | `sort={"createdAt":-1}` | `1` tăng dần, `-1` giảm dần; nhiều khóa được. Mặc định: mới tạo trước |
| `select` | các trường cách nhau bằng **dấu cách** | `select=memberCode fullName` | Chỉ trả các trường này. Thêm `-` phía trước để loại bỏ trường: `select=-note` |
| `condition` | JSON | `condition={"memberType":"MENTEE","status":"ACTIVE"}` | Chỉ hỗ trợ **so sánh bằng**, các trường là AND |
| `filters[]` | JSON, lặp lại nhiều lần | xem bên dưới | Dùng cho mọi phép lọc khác bằng |

Kết quả `GET /member/page?page=1&limit=2&select=memberCode fullName&sort={"memberCode":1}`:
```json
{ "success": true, "data": { "page": 1, "skip": 0, "limit": 2, "total": 3,
  "result": [ { "memberCode": "HLC-MTE-00001", "fullName": "Nguyễn Văn An" },
              { "memberCode": "HLC-MTE-00002", "fullName": "Trần Thị Bình" } ] } }
```

### 6.1 `condition`
- Tên trường phải có trong bảng của resource ở mục 13, giá trị phải đúng kiểu và đúng enum. Nếu không, server trả `400 "Error parsing condition"`.
- **Không dùng toán tử** kiểu `{"status":{"$in":[...]}}` trong `condition` (sẽ bị 400). Muốn lọc theo toán tử thì dùng `filters`.
- Lọc theo id: `condition={"_id":"6ad8…"}`.

### 6.2 `filters[]`
Mỗi filter là một JSON:
```json
{ "field": "fullName", "operator": "contain", "values": ["văn"] }
```
- Truyền nhiều `filters[]` thì các điều kiện là **AND**.
- `values` **luôn là mảng**, kể cả khi chỉ có 1 giá trị.

| `operator` | Ý nghĩa | `values` |
|---|---|---|
| `eq` / `ne` | bằng / khác | `[x]` |
| `gt` `gte` `lt` `lte` | so sánh | `[x]` (số, ngày `YYYY-MM-DD` hoặc ISO) |
| `between` / `not_between` | trong khoảng / ngoài khoảng (tính cả 2 đầu mút) | `[từ, đến]` |
| `in` / `not_in` | thuộc / không thuộc danh sách | `[a, b, c]` |
| `contain` / `not_contain` | chứa chuỗi. **Không phân biệt hoa thường và dấu**: `"van"` khớp "Văn" | `["chuỗi"]` |
| `start` / `end` | bắt đầu / kết thúc bằng (không phân biệt hoa thường, dấu) | `["chuỗi"]` |
| `like` / `not_like` | SQL LIKE (`%` là ký tự đại diện, có phân biệt hoa thường) | `["%abc%"]` |
| `null` / `not_null` | rỗng / không rỗng | bỏ trống |
| `or` / `and` | gộp nhóm filter con | dùng `filters: [...]` thay cho `values` |

Ví dụ thật:
```text
# tên chứa "van" (khớp cả "Văn")
GET /member/many?filters[]={"field":"fullName","operator":"contain","values":["van"]}

# mã thuộc danh sách VÀ tên bắt đầu bằng "Lê"
GET /member/many?filters[]={"field":"memberCode","operator":"in","values":["HLC-MTE-00001","HLC-MTE-00003"]}
                &filters[]={"field":"fullName","operator":"start","values":["Lê"]}

# điều kiện HOẶC
GET /member/many?filters[]={"operator":"or","filters":[
    {"field":"memberCode","operator":"eq","values":["HLC-MTE-00001"]},
    {"field":"memberCode","operator":"eq","values":["HLC-MTE-00002"]}]}

# ngày tham gia trong tháng 9
GET /member/many?filters[]={"field":"joinedAt","operator":"between","values":["2026-09-01","2026-09-30"]}
```
(Các ví dụ trên viết chưa encode cho dễ đọc. Khi gọi thật phải encode; axios với `paramsSerializer` ở mục 15 sẽ tự làm.)

### 6.3 `population`
**Chưa dùng được.** Gửi `population[]` sẽ nhận `500`. Muốn hiển thị dữ liệu liên kết (ví dụ tên mentor của một cặp), FE gọi thêm `GET /member/many` với `filters[]={"field":"_id","operator":"in","values":[...ids]}` rồi tự ghép.

---

## 7. Quy ước kiểu dữ liệu

| Kiểu trong mục 13 | Gửi lên | Nhận về |
|---|---|---|
| `id` | `_id` của bản ghi khác, chuỗi 24 ký tự hex, ví dụ `"6ad84517d881385fc6cc054d"` | Như gửi |
| `string` | Chuỗi; có giới hạn độ dài nếu ghi `≤ N ký tự` | Như gửi |
| `enum` | **Đúng một** trong các giá trị liệt kê, phân biệt hoa thường | Như gửi |
| `integer` / `number` | Số JSON (không gửi chuỗi `"100"`) | **Số**, kể cả tiền và điểm thập phân (ví dụ `10000.5`) |
| `boolean` | `true` / `false` | Như gửi |
| `date YYYY-MM-DD` | Chuỗi `"2026-09-01"`. Ngày phải có thật: `"2003-02-30"` hoặc `"20/05/2003"` sẽ bị 400 | `"2026-09-01"` |
| `datetime ISO 8601` | Nên gửi kèm múi giờ: `"2026-10-21T20:00:00+07:00"` | UTC: `"2026-10-21T13:00:00.000Z"` |
| `object (JSON)` | Object JSON | Như gửi |
| `array (JSON)` | Mảng JSON | Như gửi |

- Mọi bản ghi trả về đều có thêm `_id`, `createdAt`, `updatedAt`. Không gửi 3 trường này lên.
- Trường không có giá trị sẽ trả về `null`, không bị lược bỏ khỏi object.
- Trường đánh dấu *bắt buộc* chỉ bắt buộc khi **tạo mới**. Khi sửa (`PUT`), mọi trường đều tùy chọn.

---

## 8. Upload file và đính kèm

Ảnh minh chứng (recap, quỹ, bài nộp) đi theo 2 bước:

**Bước 1: Upload** `POST /file` (mọi tài khoản đã đăng nhập), `multipart/form-data`:

| Field | Giá trị |
|---|---|
| `file` | File cần upload |
| `scope` | `Public` \| `Internal` \| `Private` (hiện dùng `Public`) |

Response:
```json
{ "success": true, "data": {
    "file": { "_id": "6ad838bb6f8dae8fcab99d97", "name": "proof.png", "mimetype": "image/png", "size": 69, "storageType": "Database", "scope": "Public", "author": "6ad8…", "authorName": "Mentee 1", "createdAt": "…", "updatedAt": "…" },
    "url": "http://localhost:3000/file/6ad838bb6f8dae8fcab99d97/proof.png" } }
```
- Loại file được nhận: ảnh `webp bmp jpg jpeg png gif`, tài liệu `pdf doc docx xls xlsx ppt pptx txt`, âm thanh `mp3`. Loại khác trả `400 error-file-invalid-mimetype`. File được lưu nguyên, không nén.
- Hiển thị/tải file: dùng thẳng `url` (`GET /file/:id/:name`, **không cần token**). Lấy metadata: `GET /file/:id/info`. Xóa file: `DELETE /file/:id`.

**Bước 2: Gắn file vào bản ghi** `POST /attachment` (hiện chỉ Admin tổng):
```json
{ "ownerType": "FUND_CONTRIBUTION", "ownerId": "<_id minh chứng quỹ>", "fileId": "6ad838bb6f8dae8fcab99d97",
  "url": "http://localhost:3000/file/6ad838bb6f8dae8fcab99d97/proof.png", "mimeType": "image/png", "fileName": "proof.png" }
```
Lấy ảnh của một bản ghi: `GET /attachment/many?condition={"ownerType":"FUND_CONTRIBUTION","ownerId":"<id>"}&sort={"sortOrder":1}`.

---

## 9. Xuất / nhập Excel

### 9.1 Xuất (mọi resource)
1. `GET /{resource}/export/definition` → danh sách cột:
   ```json
   [ { "label": "Mã thành viên", "fields": ["memberCode"], "labels": ["Mã thành viên"], "required": true, "type": "String" }, … ]
   ```
2. `POST /{resource}/export/xlsx` với các cột muốn xuất. Query string nhận cùng bộ lọc với mục 6.
   ```json
   { "definitions": [ { "fields": ["memberCode"], "labels": ["Mã thành viên"] },
                      { "fields": ["fullName"], "labels": ["Họ và tên"] } ] }
   ```
   Response là **file nhị phân** `.xlsx`, không bọc JSON. Với axios cần đặt `responseType: "blob"`.

### 9.2 Nhập (`member`, `library-item`)
1. `GET /{resource}/import/template/xlsx`: tải file mẫu.
2. FE đọc file Excel ra mảng object, key là tên trường ở mục 13 (lấy từ `GET /{resource}/import/definition`).
3. `POST /{resource}/import/validate`: chạy thử rồi hoàn tác, **không ghi** dữ liệu.
   ```json
   { "rows": [ { "memberCode": "HLC-MTE-00010", "memberType": "MENTEE", "fullName": "A" },
               { "memberCode": "HLC-MTE-00011", "memberType": "SAI", "fullName": "B" } ],
     "mode": "CREATE" }
   ```
   `mode`: `CREATE` (mặc định) \| `UPDATE` \| `UPSERT`. Response cho biết lỗi **theo từng dòng**, dùng để tô đỏ dòng lỗi trên màn hình:
   ```json
   { "success": true, "data": { "error": true, "validate": [
       { "index": 0, "row": { … }, "rowErrors": [], "insertResult": { "_id": "…", … } },
       { "index": 1, "row": { … }, "rowErrors": ["memberType must be one of the following values: MENTEE, MENTOR"] } ] } }
   ```
   `data.error = true` nghĩa là có ít nhất một dòng lỗi.
4. `POST /{resource}/import/insert`: cùng body, ghi thật. Response cùng cấu trúc.

---

## 10. API nghiệp vụ mentoring

Ngoài CRUD thô ở mục 5, phần mentoring có các API nghiệp vụ dưới đây. **Frontend nên dùng các API này thay vì CRUD `/mentoring-pair`, `/mentoring-session`…**: chúng áp đủ quy tắc (mốc thời gian, quyền sửa lịch, hạn recap…) và trả dữ liệu đã ghép sẵn.

### 10.1 Mô hình và quy tắc

- **Quý** (`2026Q4`) → **cặp** mentor–mentee cho cả quý (mã `Q42026O00012E00034`) → **buổi theo tháng** (mã `T10Q42026O00012E00034`). Mỗi cặp có 1 buổi / tháng.
- **Mốc thời gian**, tính theo giờ Việt Nam, trong tháng cuối của quý trước:

  | Mốc | Việc được làm |
  |---|---|
  | Ngày 5 | Mentee gửi nguyện vọng (đến trước ngày 10) |
  | Ngày 10 | Admin ghép cặp quý kế tiếp |
  | Ngày 25 | Mentor/mentee thấy cặp |

- **Lịch:** hai bên tự hẹn ngoài hệ thống, rồi mentor hoặc mentee gửi **lịch đã chốt**.
  - Lịch phải ở tương lai và nằm trong tháng của buổi.
  - Được sửa **trước thời điểm đã chốt lần đầu** (`schedule.firstStartAt`); qua mốc đó chỉ admin ghi đè được.
- **Recap:** mỗi người viết 1 recap cho mỗi buổi.
  - Viết sau khi buổi kết thúc, cần ít nhất 1 ảnh.
  - **Hạn nộp = giờ bắt đầu buổi + 24h** (`recapDeadlineAt`).
  - Sửa được cho tới khi admin duyệt. Bị từ chối thì nộp lại sẽ được tính như một lần nộp mới.
- **Trạng thái**, do server tính sẵn theo thời điểm hiện tại:

  | Của từng người (`recapStatus.mentor/mentee`) | Của cặp (`recapStatus.pair`) |
  |---|---|
  | `NO_SCHEDULE` Chưa có lịch | `NO_SCHEDULE`, `CANCELLED` |
  | `PENDING` Chờ: chưa nộp, chưa tới hạn | `PENDING` Chờ |
  | `SUBMITTED` Đã nộp: đúng hạn | `DONE` Đã xong: cả hai đã nộp đúng hạn |
  | `LATE` Nộp muộn | `LATE` Nộp muộn |
  | `MISSING` Chưa xong: quá hạn chưa nộp, hoặc bị từ chối | `MISSING` Chưa xong |

  Ưu tiên của trạng thái cặp: Chưa xong > Nộp muộn > Đã xong > Chờ.
  Với dữ liệu import từ Excel cũ, `recapStatus.source = "IMPORTED"`.
- **Khóa quý:** khi quý bị khóa, mọi thay đổi (ghép cặp, lịch, recap, duyệt) đều bị chặn.
- **Ngày giả lập:**
  - `GET /time/mock`: mọi tài khoản đã đăng nhập, trả `{ date, source, enabled, now }`.
  - `PUT /time/mock` `{ "date": "2026-10-02" | null }`: chỉ Admin.
  - Ngày giả lập chỉ thay **ngày**, giờ trong ngày vẫn là giờ thật. Mọi quy tắc trên dùng `now` này.

### 10.2 Admin (Admin tổng hoặc quyền `MENTORING`)

| Method | Path | Body | `data` trả về |
|---|---|---|---|
| `GET` | `/mentoring/quarters` | — | Danh sách quý (`QuarterView`) |
| `POST` | `/mentoring/quarters/ensure` | `{ "code": "2026Q4" }` | Quý (tạo nếu chưa có: quý hiện tại, hoặc quý kế tiếp từ ngày 5) |
| `GET` | `/mentoring/quarters/:code/board` | — | `{ quarter, sessions: SessionView[], preferences[] }`: toàn bộ dữ liệu của màn quản lý ghép cặp |
| `PUT` | `/mentoring/quarters/:code/lock` | `{ "isLocked": true }` | Quý |
| `POST` | `/mentoring/quarters/:code/pairs` | `{ "mentorCode": "HLC-MTO-00012", "menteeCode": "HLC-MTE-00034", "month": 10 }` | `{ pair, syncedMonths: [10,11,12] }`: tạo buổi từ tháng đó tới hết quý |
| `POST` | `/mentoring/quarters/:code/import` | `multipart/form-data`, field `file` (.xlsx/.csv đúng mẫu đang dùng: dòng tiêu đề có `MÃ MENTORING`, `CHỨC DANH`, `HLC ID`; dòng Mentor rồi dòng Mentee) | `{ pairsRead, createdPairs, updatedPairs, failed, errors: [{ row, message }] }` |
| `PUT` | `/mentoring/sessions/:id/pair` | `{ "mentorCode": "...", "menteeCode": "..." }` | Đổi cặp **từ tháng của buổi này trở đi** (lịch các tháng đó bị gỡ; tháng đã có recap thì không đổi được) |
| `DELETE` | `/mentoring/sessions/:id` | — | Xóa buổi này **và các tháng sau** của cặp, kèm recap, giải, điểm liên quan |
| `PUT` | `/mentoring/sessions/:id/schedule/override` | `ScheduleInput` (mục 10.3) | Admin ghi đè lịch (được đặt cả quá khứ) |
| `PUT` | `/mentoring/recaps/:id/review` | `{ "status": "APPROVED" \| "REJECTED", "note": "..." }` (`note` bắt buộc khi từ chối) | `SessionView` |
| `GET` | `/mentoring/reports/quarters` | — | Báo cáo mọi quý: mỗi cặp 2 dòng (Mentor/Mentee), mỗi tháng `{ code, status }` |
| `GET` | `/mentoring/reports/quarters/:code/export.xlsx` | — | File Excel (chỉ sau khi quý kết thúc, trước đó `409`) |
| `GET` | `/mentoring/members?type=MENTOR\|MENTEE&includeInactive=true` | — | Danh sách thành viên (`MemberView`) |

**Thành viên và tài khoản** (chỉ Admin tổng):

| Method | Path | Body | `data` trả về |
|---|---|---|---|
| `POST` | `/member/import-file` | `multipart/form-data`, field `file`: Excel thành viên (cột `HLC ID`, `HỌ VÀ TÊN`, `NGÀY SINH`, `SĐT`, `EMAIL`, `SỐ TÀI KHOẢN`, `NGÂN HÀNG`, `PROFILE`…; nhận cả tên cột có "(Nhập tay)") | `{ created, updated, failed, errors[] }`, cập nhật theo mã thành viên |
| `POST` | `/member/accounts/generate` | `{ "defaultPassword"?: "...", "memberCodes"?: [...] }` | Tạo tài khoản cho thành viên chưa có. Username = mã viết thường (`hlc-mte-00001`), mật khẩu = ngày sinh `ddmmyyyy`; thiếu ngày sinh thì dùng `defaultPassword` |

### 10.3 Mentor / mentee (của chính mình)

| Method | Path | Body | `data` trả về |
|---|---|---|---|
| `GET` | `/mentoring/me` | — | `{ member, now, quarters, sessions: MySessionView[], preference }`. Chỉ gồm các quý đã công bố (từ ngày 25) |
| `PUT` | `/mentoring/sessions/:id/schedule` | `ScheduleInput` | `SessionView`: gửi hoặc sửa lịch đã chốt |
| `PUT` | `/mentoring/sessions/:id/recap` | `{ "content": "...", "fileIds": ["<_id từ POST /file>"] }` | `SessionView`: gửi hoặc sửa recap (ít nhất 1 file ảnh) |
| `PUT` | `/mentoring/me/preference` | `{ "quarterCode": "2027Q1", "mentorCodes": ["HLC-MTO-..."] (3–10, theo thứ tự ưu tiên), "message"?: "..." }` | Nguyện vọng đã lưu (chỉ mentee, trong khoảng ngày 5 đến trước ngày 10) |
| `GET` | `/mentoring/me/report` | — | Báo cáo theo quý của chính mình (quý đã kết thúc hoặc đã có recap) |
| `GET` | `/mentoring/mentors` | — | Danh sách mentor đang hoạt động (để chọn nguyện vọng) |

`ScheduleInput`:
```json
{ "startAt": "2026-10-02T19:00:00+07:00", "endAt": "2026-10-02T20:00:00+07:00", "location": "Online", "meetingLink": "https://meet.google.com/...", "note": "..." }
```

`MySessionView` (rút gọn từ response thật):
```json
{
  "_id": "6ad8…", "code": "T10Q42026O00001E00001", "quarterCode": "2026Q4", "year": 2026, "month": 10, "monthIndex": 1,
  "status": "ACTIVE",
  "pair": { "_id": "6ad8…", "code": "Q42026O00001E00001", "status": "ACTIVE", "source": "MANUAL" },
  "mentor": { "_id": "…", "memberCode": "HLC-MTO-00001", "fullName": "Mentor Một", "phone": "0901000001", "email": "…", "profileUrl": "…", "memberType": "MENTOR", "status": "ACTIVE" },
  "mentee": { "…": "…" },
  "schedule": { "startAt": "2026-10-02T03:31:00.000Z", "endAt": "…", "firstStartAt": "2026-10-01T13:00:00.000Z", "location": null, "meetingLink": "https://meet/x", "note": null, "submittedAt": "…", "submittedBy": "HLC-MTO-00001" },
  "recapDeadlineAt": "2026-10-03T03:31:00.000Z",
  "recaps": {
    "mentor": null,
    "mentee": { "_id": "…", "role": "MENTEE", "memberCode": "HLC-MTE-00001", "content": "…", "firstSubmittedAt": "…", "lastSubmittedAt": "…", "isLate": false, "reviewStatus": "PENDING", "reviewNote": null, "reviewedAt": null, "media": [ { "fileId": "…", "url": "http://localhost:5000/file/…/recap.png", "fileName": "recap.png", "mimeType": "image/png" } ] }
  },
  "recapStatus": { "mentor": "PENDING", "mentee": "SUBMITTED", "pair": "PENDING", "source": "SYSTEM" },
  "myRole": "MENTEE", "canEditSchedule": false, "canWriteRecap": true
}
```
FE chỉ cần dựa vào `canEditSchedule` / `canWriteRecap` để bật tắt nút, không cần tự tính lại quy tắc.

**Mã lỗi nghiệp vụ hay gặp** (đều có `message` tiếng Việt):

| `code` | Khi nào |
|---|---|
| `error-mentoring-pairing-closed` | Ghép cặp ngoài cửa sổ (quý cũ, hoặc quý tới khi chưa tới ngày 10) |
| `error-mentoring-mentee-already-paired` | Mentee đã có mentor khác trong quý |
| `error-mentoring-quarter-locked` | Quý đã khóa |
| `error-mentoring-not-visible` | Chưa tới ngày công bố cặp |
| `error-mentoring-schedule-locked` | Đã qua thời điểm chốt lần đầu, không sửa được lịch |
| `error-mentoring-schedule-month` / `-past` / `-range` | Lịch ngoài tháng / ở quá khứ / kết thúc trước bắt đầu |
| `error-mentoring-recap-too-early` | Viết recap trước khi buổi kết thúc |
| `error-mentoring-recap-image-required` | Recap không có ảnh |
| `error-mentoring-recap-approved` | Sửa recap đã được duyệt |
| `error-mentoring-preference-closed` | Gửi nguyện vọng ngoài khoảng ngày 5–10 |
| `error-member-not-linked` | Tài khoản chưa gắn với hồ sơ thành viên |

---

## 11. API điểm phụ cấp, HLC Fund, học tập, phân quyền, dashboard

Cũng như mục 10, **FE dùng các API này thay vì CRUD thô** của `point-entry`, `fund-contribution`, `submission`…: chúng kiểm tra quy tắc nghiệp vụ và trả dữ liệu đã ghép sẵn (tên thành viên, ảnh, loại điểm…).

Quy ước chung:
- `{code}` của kỳ có dạng `YYYY-MM` (ví dụ `2026-10`). Kỳ được tạo tự động khi cần.
- Kỳ **đã chốt** (`LOCKED`, `EXPORTED`, `PAID`): mọi thao tác ghi vào kỳ đó (tính lại, cộng/trừ điểm, nộp/duyệt quỹ, nộp/chấm bài) trả `409 error-period-locked`.
- Mọi ngày giờ tính theo giờ Việt Nam và theo ngày giả lập nếu đang bật (`/time/mock`).

### 11.1 Danh mục mặc định

Mỗi lần backend khởi động, nếu còn thiếu, server tự tạo (không ghi đè chỉnh sửa của admin):

| Danh mục | Mã |
|---|---|
| Ban | `BAN_HOC_TAP`, `BAN_HLC_FUND`, `BAN_MENTORING` |
| Chức vụ | `TRUONG_BAN`, `PHO_BAN`, `LEADER`, `PHO_LEADER` |
| Loại điểm | `MENTORING_EARLY`, `MENTORING_AWARD`, `POSITION`, `FUND`, `LEARNING`, `MANUAL_BONUS`, `MANUAL_PENALTY` |
| Quy tắc điểm | `MENTORING_EARLY_D1_7` (+2), `MENTORING_EARLY_D8_13` (+1), `MENTORING_AWARD_RANK_1/2/3` (+5/+3/+2), `FUND_MONTHLY_FULL` (+2 khi quỹ đã duyệt ≥ 150.000đ), `POSITION_*` (đang tắt, 0 điểm) |
| Module học tập | `READING` (đọc sách, link YouTube không trùng), `FAVORITE_ARTICLE` (bài tâm đắc), `ACADEMIC_WEEKLY` (3–4 bài/tuần) |

Admin sửa quy tắc và loại điểm bằng CRUD `/point-rule`, `/point-type` (mục 5).

### 11.2 Điểm phụ cấp: Admin tổng hoặc quyền `POINT`

| Method | Path | Body | `data` trả về |
|---|---|---|---|
| `GET` | `/points/periods` | — | Danh sách kỳ (mới nhất trước), mỗi kỳ có thêm `isLocked` |
| `POST` | `/points/periods/{code}/ensure` | — | Kỳ (tạo nếu chưa có; đơn giá kế thừa kỳ trước) |
| `PUT` | `/points/periods/{code}/settings` | `{ pointRate?, baseAllowance?, payoutDate? }` | Kỳ sau khi sửa. Bảng tổng hợp được tính lại tiền |
| `POST` | `/points/periods/{code}/recalculate` | — | `{ created, reactivated, updated, voided, unchanged, members, awards: [{ rank, sessionCode }] }` |
| `GET` | `/points/periods/{code}/summary` | — | `{ period, pointTypes: [{ code, name }], rows: [{ member, pointsByType: { MENTORING_EARLY: 2, … }, totalPoints, amount, … }], totals }` |
| `GET` | `/points/periods/{code}/members/{memberId}` | — | Chi tiết 1 người: `{ summary, entries: [{ pointType, description, points, status, sourceType }], adjustments }` |
| `GET` | `/points/periods/{code}/adjustments?status=PENDING` | — | Danh sách điều chỉnh / khiếu nại |
| `POST` | `/points/periods/{code}/adjustments` | `{ memberId, points, reason, pointTypeId? }` | Điều chỉnh thủ công, **áp dụng ngay**. `points` âm = trừ. Bỏ trống `pointTypeId` thì server chọn `MANUAL_BONUS` / `MANUAL_PENALTY` |
| `PUT` | `/points/adjustments/{id}/review` | `{ status: "APPROVED" \| "REJECTED", note?, points? }` | Xử lý khiếu nại. `points` để sửa số điểm khi duyệt |
| `DELETE` | `/points/adjustments/{id}` | — | Hủy điều chỉnh đã áp dụng (dòng điểm chuyển `VOID`) |
| `POST` | `/points/periods/{code}/lock` | — | Chốt kỳ, lưu cố định họ tên và số tài khoản vào bảng tổng hợp |
| `POST` | `/points/periods/{code}/unlock` | — | Mở lại kỳ đã chốt (không mở được kỳ `PAID`) |
| `POST` | `/points/periods/{code}/paid` | — | Đánh dấu đã chi trả |
| `GET` | `/points/periods/{code}/export.xlsx` hoặc `export.csv` | — | **File** bảng chi trả (chỉ khi đã chốt). Kỳ chuyển `EXPORTED`, mỗi lần xuất ghi 1 dòng `period-export` |
| `GET` | `/points/periods/{code}/exports` | — | Lịch sử xuất file |

**Tính lại điểm** (`recalculate`, server cũng tự chạy lúc 01:00 hằng ngày cho kỳ hiện tại và kỳ trước nếu chưa chốt):
- **Mentoring sớm:** dựa trên lần nộp recap **đầu tiên** của mentee, theo ngày trong tháng (1–7: +2, 8–13: +1, chỉ nhận mức cao hơn). Recap bị từ chối không tính.
- **Xếp giải nhất/nhì/ba:** chỉ cặp “Đã xong” (cả hai nộp đúng hạn). Buổi diễn ra sớm hơn xếp trên; nếu bằng nhau, cặp hoàn tất recap sớm hơn xếp trên; cuối cùng xếp theo mã. Không có đồng giải. Kết quả ghi vào `mentoring-award`.
- **Quỹ:** tổng minh chứng **đã duyệt** trong tháng ≥ `conditions.minApprovedAmount`.
- **Chức vụ:** chức vụ còn hiệu lực ít nhất 1 ngày trong tháng (rule `POSITION_*` phải bật và có điểm).
- **Bài nộp học tập:** chỉ khi admin tạo rule `sourceType = SUBMISSION` (`conditions.moduleCode`, `conditions.minScore`).
- Chạy lại nhiều lần không sinh dòng trùng. Dòng không còn đúng điều kiện chuyển `VOID`; điểm cộng tay được giữ nguyên.
- Thành tiền = `baseAllowance + totalPoints × pointRate`. Thành viên ngừng hoạt động không được tính điểm tự động.

Lỗi thường gặp: `409 error-period-locked`, `409 error-period-not-locked` (xuất file khi chưa chốt), `409 error-point-adjustment-reviewed`.

### 11.3 Điểm của tôi: Mentor / Mentee

| Method | Path | Body | `data` trả về |
|---|---|---|---|
| `GET` | `/points/me?period=2026-10` | — | Như chi tiết 1 người (chỉ dòng `ACTIVE`), thêm `history: [{ periodCode, totalPoints, amount, status }]`. Mặc định tháng hiện tại |
| `POST` | `/points/me/periods/{code}/appeals` | `{ points, reason, relatedEntryId? }` | Khiếu nại, trạng thái `PENDING` chờ admin xử lý |

### 11.4 HLC Fund

Thành viên (Mentor / Mentee):

| Method | Path | Body | `data` trả về |
|---|---|---|---|
| `GET` | `/fund/me?period=2026-10` | — | `{ period, target: { minApprovedAmount, points }, approvedAmount, pendingAmount, reached, isEligible, contributions: [...] }` |
| `POST` | `/fund/me/contributions` | `{ contributionDate: "2026-10-05", amount: 100000, note?, fileIds: ["…"] }` | Minh chứng (`status: PENDING`, kèm `files`) |
| `PUT` | `/fund/me/contributions/{id}` | như trên | Sửa hoặc gửi lại minh chứng chưa duyệt / bị từ chối. Sau khi gửi, trạng thái quay về `PENDING` |
| `DELETE` | `/fund/me/contributions/{id}` | — | Xóa minh chứng chưa duyệt |

- `fileIds`: 1–10 **ảnh** đã upload qua `POST /file`.
- `contributionDate` không được ở tương lai (`400 error-fund-date-invalid`). Kỳ của minh chứng lấy theo tháng của ngày đóng.
- Minh chứng đã duyệt thì không sửa hay xóa được (`409 error-fund-contribution-reviewed`).

Ban HLC Fund (Admin tổng hoặc quyền `FUND`):

| Method | Path | Body | `data` trả về |
|---|---|---|---|
| `GET` | `/fund/contributions?period=&date=&status=&memberId=` | — | Danh sách minh chứng kèm `member` và `files` |
| `PUT` | `/fund/contributions/{id}/review` | `{ status: "DONE" \| "NOT_DONE", note? }` | `{ updated, rows }` |
| `PUT` | `/fund/contributions/review` | `{ ids: [...], status, note? }` | Duyệt hàng loạt: `{ updated, rows }` |
| `GET` | `/fund/stats/{code}` | — | `{ target, totals: { contributions, pending, approvedAmount, mentees, reached, notContributed }, byDate: [...], members: [{ member, approved, pending, reached }] }` |

### 11.5 Học tập

Thành viên (Mentor / Mentee):

| Method | Path | Body | `data` trả về |
|---|---|---|---|
| `GET` | `/learning/me` | — | `{ member, modules: [{ …module, fields, criteria, currentCycle: { cycleKey, submitted, min, max, canSubmit }, submissions }] }` |
| `POST` | `/learning/modules/{moduleId}/submissions` | `{ data: { <key>: <giá trị> } }` | Bài nộp |
| `PUT` | `/learning/modules/{moduleId}/submissions/{id}` | như trên | Sửa hoặc nộp lại bài chưa duyệt / bị trả |
| `DELETE` | `/learning/submissions/{id}` | — | Xóa bài chưa duyệt |
| `GET` | `/learning/library?type=BOOK` | — | Thư viện (chỉ mục đang hiển thị) |

Giá trị trong `data` theo `fieldType` của trường:

| `fieldType` | Giá trị gửi |
|---|---|
| `TEXT`, `LONG_TEXT`, `URL`, `SELECT` | chuỗi |
| `YOUTUBE_URL` | link YouTube bất kỳ dạng nào (`youtu.be/…`, `watch?v=…`, `shorts/…`). Server chuẩn hóa thành `https://www.youtube.com/watch?v=<id>` |
| `NUMBER` | số |
| `DATE` | `"YYYY-MM-DD"` |
| `MULTI_SELECT` | mảng chuỗi |
| `LIBRARY_ITEM` | `_id` sách/tài liệu trong thư viện (đúng `libraryType` của module) |
| `IMAGE`, `FILE` | mảng `fileId` đã upload. Bài trả về có `files: [{ fieldKey, url, … }]` |

- **Chu kỳ** (`cycleKey`): `DAILY` → `2026-10-21`, `WEEKLY` → tuần ISO `2026-W43`, `MONTHLY` → `2026-10`.
- Vượt `maxSubmissionsPerCycle` (bài bị trả không tính): `409 error-submission-limit`.
- Trường `isUnique` (mặc định bật cho `YOUTUBE_URL`): cùng giá trị đã có ở bài khác của module thì nhận `409 error-submission-duplicate`. Bài bị trả sẽ giải phóng giá trị đó.
- Thiếu trường bắt buộc: `400 error-submission-field-required`. Sai định dạng: `400 error-submission-field-invalid`.

Quản lý (Admin tổng; hoặc quyền `LEARNING_MODULE`, **chỉ với đúng module được giao**):

| Method | Path | Body | `data` trả về |
|---|---|---|---|
| `GET` | `/learning/modules` | — | Module được quản lý, kèm `fields`, `criteria`, `pendingReviews` |
| `POST` | `/learning/modules` | cấu hình module (dưới đây). **Chỉ Admin tổng** | Module mới, mã tự sinh `LM-0001`… |
| `GET` / `PUT` | `/learning/modules/{id}` | cấu hình module | Module |
| `GET` | `/learning/modules/{id}/submissions?status=PENDING&cycleKey=&period=` | — | Bài nộp kèm `member`, `files`, `scores`, `libraryItem` |
| `GET` | `/learning/modules/{id}/progress?cycleKey=` | — | `{ cycleKey, min, max, totals: { members, reached }, members: [{ member, submitted, approved, reached }] }` |
| `PUT` | `/learning/submissions/{id}/review` | `{ status: "APPROVED" \| "REJECTED", feedback?, scores?: [{ criterionId, score }], totalScore? }` | Bài sau khi chấm |
| `GET` | `/learning/library/all` | — | Cả mục đang ẩn |
| `POST` / `PUT` / `DELETE` | `/learning/library[/{id}]` | `{ libraryType, title, author?, category?, description?, externalUrl?, isActive? }` | Mục đã có bài nộp dùng tới thì `DELETE` chỉ ẩn |

Cấu hình module (`POST` / `PUT /learning/modules`):
```json
{
  "name": "Thuyết trình", "cycleType": "MONTHLY", "targetMemberType": "MENTEE",
  "minSubmissionsPerCycle": 1, "maxSubmissionsPerCycle": 2, "libraryType": null,
  "requireReview": true, "enableScoring": true, "maxScore": 100, "isActive": true,
  "fields": [
    { "key": "topic", "label": "Chủ đề", "fieldType": "TEXT", "isRequired": true },
    { "key": "level", "label": "Mức", "fieldType": "SELECT", "options": ["Dễ", "Khó"] }
  ],
  "criteria": [ { "name": "Nội dung", "maxScore": 60 }, { "name": "Trình bày", "maxScore": 40 } ]
}
```
- `PUT` thay toàn bộ danh sách trường. Trường cũ khớp theo `_id` hoặc `key`; trường bị bỏ chuyển sang tắt (bài cũ vẫn hiển thị được). Tiêu chí gửi kèm `_id` để giữ điểm đã chấm.
- Chấm có tiêu chí: tổng = (tổng điểm tiêu chí / tổng điểm tối đa) × `maxScore`. Ví dụ 50/60 + 30/40 → 80/100. Không có tiêu chí thì gửi `totalScore`.
- Điểm vượt mức tối đa: `400 error-submission-score-invalid`. Quản lý module không được giao: `403 error-learning-module-forbidden`.

### 11.6 Phân quyền theo phạm vi

| Method | Path | Ai gọi | `data` trả về |
|---|---|---|---|
| `GET` | `/access/me` | Mọi người đăng nhập | `{ systemRole, isSuperAdmin, scopes: ["FUND", …], moduleIds: [...] }`. FE dùng để hiện menu quản trị cho mentee/mentor được giao quyền |
| `GET` | `/access/permissions` | Admin tổng | Danh sách quyền kèm `user`, `member`, `module` |
| `POST` | `/access/permissions` | Admin tổng | Body `{ account: "HLC-MTE-00003" hoặc username, scope, moduleId?, note? }`. Cấp lại quyền đã có thì trả bản ghi cũ |
| `DELETE` | `/access/permissions/{id}` | Admin tổng | Thu hồi quyền |

Ban, chức vụ, gán chức vụ, sửa hồ sơ và bật/tắt thành viên: dùng CRUD `/department`, `/position`, `/member-position`, `/member` (mục 5, chỉ Admin tổng). Thành viên `INACTIVE` không được tính điểm tự động và không hiện trong thống kê.

### 11.7 Dashboard

| Method | Path | Ai gọi | `data` trả về |
|---|---|---|---|
| `GET` | `/dashboard/admin?period=2026-10` | Admin tổng | `{ period, members, mentoring: { sessions, statusCount, doneRate, bestPairs, inactivePairs }, learning: [...], fund: { totals, byDate }, points: { totals, topMembers, needImprovement }, trend: [6 kỳ gần nhất] }` |
| `GET` | `/dashboard/me?period=2026-10` | Mentor / Mentee | `{ period, member, mentoring: [{ code, status, myStatus, partner, awardRank }], points: { totalPoints, amount, entries, history }, fund, learning: [{ module, currentCycle, pending, lastScore }] }` |

### 11.8 Nhóm, Leader và Phó nhóm

Mỗi nhóm (bản ghi `department` có `type = GROUP`) gồm cả mentor và mentee, có 1 Leader và 1 Phó nhóm (đều là mentee).
- Leader/Phó lưu bằng `member-position` với chức vụ `LEADER` / `PHO_LEADER` của nhóm. Phụ cấp chức vụ vì vậy dùng chung rule `POSITION_LEADER` / `POSITION_PHO_LEADER`.
- Thành viên thuộc nhóm lưu ở bảng `GroupMembership`. `endDate = null` là đang ở nhóm. Chuyển nhóm hay đổi Leader đều chỉ đóng bản ghi cũ, nên lịch sử được giữ.

Admin tổng:

| Method | Path | Body | `data` trả về |
|---|---|---|---|
| `GET` | `/groups` | — | Nhóm kèm `leader`, `deputy`, `members`, `counts` |
| `GET` | `/groups/unassigned` | — | Thành viên đang hoạt động chưa có nhóm |
| `POST` | `/groups` | `{ name, deputyCanReview? }` | Nhóm mới, mã tự sinh `NHOM_01`… |
| `PUT` | `/groups/{id}` | `{ name, deputyCanReview?, isActive? }` | `deputyCanReview = false`: Phó nhóm chỉ xem, không chấm/duyệt |
| `PUT` | `/groups/{id}/role` | `{ role: "LEADER" \| "DEPUTY", memberId? }` | Đặt, đổi hoặc gỡ (bỏ `memberId`) vai trò. Người mới phải là mentee (`400 error-group-leader-mentee-only`) và tự được đưa vào nhóm |
| `POST` | `/groups/{id}/members` | `{ memberIds: [...] }` | `{ moved, group }`. Người đang ở nhóm khác được chuyển sang |
| `DELETE` | `/groups/{id}/members/{memberId}` | — | Đưa khỏi nhóm (kèm gỡ chức Leader/Phó nếu có) |
| `GET` | `/groups/{id}/history` | — | `{ memberships, roles }`: lịch sử vào/rời nhóm và lịch sử Leader/Phó |

Leader / Phó nhóm (Admin dùng được với mọi nhóm; mentee thường nhận `403`):

| Method | Path | `data` trả về |
|---|---|---|
| `GET` | `/leader/overview?period=2026-10` | Mỗi nhóm có `myRole`, `canReview` và `members[]`. Mỗi thành viên gồm: `mentoring` (trạng thái cặp, trạng thái recap, `recapScore`), `learning` (số bài chu kỳ hiện tại / tối thiểu), `fund` (trạng thái từng tuần). **Không** có số tài khoản, địa chỉ |
| `GET` | `/leader/recaps?period=&groupId=&filter=UNSCORED\|SCORED\|ALL` | `{ rubric, rows }`: recap của các cặp có mentor hoặc mentee thuộc nhóm. `canScore = false` với cặp chính người chấm tham gia |
| `GET` | `/leader/recap-rubric` | Tiêu chí chấm của module `MENTORING_RECAP` |
| `PUT` | `/leader/recaps/{id}/score` | Body `{ status: "APPROVED", scores: [{ criterionId, score }], feedback? }` hoặc `{ status: "REJECTED", feedback }` |

`GET /access/me` có thêm `leaderGroups: [{ _id, name, role: "LEADER" \| "DEPUTY", canReview }]`. FE hiện menu "Nhóm của tôi" khi mảng này khác rỗng.

### 11.9 Chấm recap thang 100 và barem xếp giải

- **Liên kết với module học tập:** module `MENTORING_RECAP` ("Recap mentoring 1on1") được tạo sẵn với 3 tiêu chí: 40, 40 và 20 điểm. Admin sửa tiêu chí ở `PUT /learning/modules/{id}` như module thường. Module này không nhận bài nộp (`409`) và không hiện trong `/learning/me`.
- **Lưu điểm:** điểm lưu ngay trên bài recap gốc (`mentoring-recap`): `score`, `scoreDetails`, `scoreFeedback`, `scoredBy`, `scoredAt`. Tổng = (tổng điểm tiêu chí / tổng tối đa) × 100.
- **Người chấm:**
  - Admin;
  - người có quyền `LEARNING_MODULE` với module này;
  - Leader/Phó (khi `deputyCanReview`) của nhóm MTE chứa mentee của cặp, và chỉ với recap MTE.
- **Xung đột lợi ích:** không ai chấm được cặp mình tham gia (`403 error-recap-score-conflict`).
- **Recap bị trả** (`REJECTED`) thì xóa điểm. Người viết nộp lại thì điểm cũng được xóa.
- **Xếp giải Nhất/Nhì/Ba** (khi Tính lại):
  - chỉ xét cặp "Đã xong";
  - sắp theo **điểm recap MTE** (chưa chấm tính 0; recap MTO không có điểm, xem 11.13);
  - bằng điểm thì buổi diễn ra sớm hơn xếp trên, rồi cặp hoàn tất recap sớm hơn, rồi theo mã.
  - Kết quả `recalculate` có `awards[].recapScore` và `unscoredRecaps` (số recap của các cặp "Đã xong" chưa chấm).

### 11.10 Ghi đè lịch, nhật ký, xuất/nhập Excel lịch

- `PUT /mentoring/sessions/{id}/schedule/override` **bắt buộc** `reason` (`400 error-mentoring-override-reason-required`). Sau khi ghi đè:
  - hạn recap = giờ mới + 24h;
  - mốc chốt lần đầu = giờ mới;
  - trạng thái đúng hạn/trễ của các recap đã nộp được tính lại (recap vẫn giữ nguyên);
  - điểm của kỳ (nếu chưa chốt) được tính lại ngay.
- `GET /mentoring/schedule-logs?quarter=2026Q4&sessionId=&onlyOverride=true` (Admin hoặc quyền `MENTORING`): nhật ký `{ action, oldStartAt, oldEndAt, newStartAt, newEndAt, reason, actor, sessionCode, createdAt }`. Không có API sửa hay xóa nhật ký.
- `GET /mentoring/quarters/{code}/schedules/export.xlsx`: file mẫu chuẩn.
  - Sheet `LICH_MENTORING`; dòng 1 là `HLC_LICH_MENTORING_V1` + mã quý; dòng 2 là tiêu đề cột.
  - Mỗi buổi 1 dòng. Giờ dạng `dd/MM/yyyy HH:mm` (giờ VN).
- `POST /mentoring/quarters/{code}/schedules/import?dryRun=true|false` (multipart `file`) → `{ valid, applied, errors: [{ row, message }], changes: [...] }`.
  - **Server kiểm tra:** đúng mẫu và đúng quý; mã buổi có trong quý; mã mentor/mentee khớp cặp; định dạng ngày giờ; kết thúc sau bắt đầu; nằm trong tháng của buổi; dòng có thay đổi phải ghi lý do; không xóa lịch qua file.
  - **Một dòng lỗi là từ chối cả file**, không thay đổi dữ liệu.
  - `dryRun=true` chỉ kiểm tra.
  - Áp dụng thì mọi thay đổi ghi trong 1 transaction, mỗi dòng ghi nhật ký ghi đè kèm lý do.

### 11.11 HLC Fund theo tuần, Leader duyệt

- `GET /fund/me` có thêm:
  - `weeks: [{ weekKey: "2026-W41", from, to, status, amount }]`, trong đó `status` là `NONE` (chưa nộp), `PENDING` (Chờ), `DONE` (Đã xong) hoặc `NOT_DONE` (Chưa xong);
  - `groupId` của người dùng.
- `GET /fund/groups/report?period=&groupId=`: Admin/quyền `FUND` xem mọi nhóm, Leader/Phó xem nhóm mình. Trả về `{ weeks, groups: [{ leader, deputy, canReview, pending, members: [{ member, total, weeks: { "2026-W41": { status, amount, ids } } }] }], contributions }`.
- `PUT /fund/groups/review`: body `{ ids, status: "DONE" | "NOT_DONE", note? }`. Leader chỉ duyệt thành viên trong nhóm mình và không tự duyệt của mình.
- `PUT /fund/contributions/review` (Admin/quyền `FUND`) vẫn duyệt được mọi minh chứng.

### 11.12 Hồ sơ cá nhân

| Method | Path | Ai gọi | Ghi chú |
|---|---|---|---|
| `GET` | `/member/me/profile` | Mentor / Mentee | Hồ sơ đầy đủ của mình (kể cả số tài khoản) |
| `PUT` | `/member/me/profile` | Mentor / Mentee | `{ dateOfBirth, gender, phone, email, address, hometown, profileUrl, bankAccount, bankName }`. `bankAccount` chỉ gồm chữ số |
| `GET` | `/member/me/profile-logs` | Mentor / Mentee | Lịch sử thay đổi của mình |
| `PUT` | `/member/{id}/profile` | Admin | Như trên, thêm `fullName, memberType, status, joinedAt, note` |
| `GET` | `/member/{id}/profile-logs` | Admin | `[{ field, oldValue, newValue, changedBy, changedByRole: "SELF" \| "ADMIN", createdAt }]` |

Mọi thay đổi các trường hồ sơ đều ghi lịch sử, kể cả khi sửa qua CRUD `PUT /member/{id}`. Leader không nhận được số tài khoản hay địa chỉ của thành viên.

### 11.13 Cập nhật vòng 2 (recap MTO/MTE, phụ cấp Leader, quỹ MTO, quý cũ, thư viện)

**Recap**
- Recap **MTO** chỉ có hai kết quả là Duyệt hoặc Không duyệt (bắt buộc lý do), không có điểm và không tính vào điểm của MTO.
  - Chỉ **Admin toàn cục** hoặc **Admin Mentoring** (quyền `MENTORING`) được xử lý recap MTO. Người khác nhận `403 error-recap-mentor-admin-only`.
- Recap **MTE** được chấm theo **một barem duy nhất** (3 tiêu chí của module `MENTORING_RECAP`).
  - Endpoint chấm: `PUT /leader/recaps/{id}/score`, dùng chung cho màn hình Mentoring của admin và màn hình Leader.
  - Duyệt recap MTE qua `PUT /mentoring/recaps/{id}/review` sẽ nhận `400 error-recap-score-required`; endpoint này vẫn dùng được để trả recap.
  - Mỗi bài có một kết quả: chấm lại thì ghi đè lên chính bài đó.
- `GET /leader/recaps`:
  - Leader/Phó chỉ nhận recap MTE của nhóm MTE mình.
  - Admin nhận cả recap MTO, với `mode: "APPROVE"`; recap MTE có `mode: "SCORE"`.
- **Điểm mentoring sớm** chỉ tính khi recap MTE đã được duyệt (đã chấm). Mốc thời gian là lần nộp của bản được duyệt: bị trả rồi nộp lại thì tính từ lần nộp lại. Diễn giải dòng điểm ghi rõ mốc này.
- **Xếp giải Nhất/Nhì/Ba** dùng điểm recap MTE.
- **Nhập recap hộ** (Admin hoặc quyền `MENTORING`):
  - `POST /mentoring/sessions/{id}/recap/proxy`, body `{ role: "MENTOR" | "MENTEE", content, fileIds?, submittedAt?, reason }`.
  - Buổi đã có recap của vai trò đó thì nhận `409 error-recap-exists`.
  - Recap trả về có `proxy: { by, at, reason, importBatchId }`.

**Nhóm**
- Nhóm có `groupKind`: `MENTEE` (nhóm MTE, chỉ gồm mentee) hoặc `FUND` (nhóm HLC Fund của MTO, chỉ gồm MTO). Truyền `groupKind` khi gọi `POST /groups`.
- Mỗi người thuộc tối đa 1 nhóm của mỗi loại.
- Leader/Phó nhóm Fund là MTE nhưng **không** là thành viên đóng quỹ của nhóm đó.

**Phụ cấp Leader / Phó nhóm**
- Rule `POSITION_LEADER` = 2 điểm, `POSITION_PHO_LEADER` = 1 điểm, tính theo **từng nhóm** người đó giữ chức.
  - Đổi chức vụ giữa tháng: người giữ chức vào **ngày cuối tháng** (hoặc hôm nay nếu tháng chưa hết) nhận phụ cấp.
- Thưởng `POSITION_LEADER_BONUS` / `POSITION_PHO_LEADER_BONUS` (+1, `sourceType: GROUP_COMPLETION`, `conditions.minCompletionRate: 0.9`) khi tỷ lệ thành viên hoàn tất **trên 90%**, tính theo số thành viên.
  - Nhóm MTE: thành viên hoàn tất khi buổi mentoring của tháng "Đã xong", recap MTE đã duyệt, và đủ số bài tối thiểu của các module tháng/tuần (tuần thuộc tháng theo ngày thứ Năm, đã kết thúc).
  - Nhóm Fund: thành viên hoàn tất khi mọi tuần của tháng có khoản đóng được duyệt bao phủ (tính cả MTO và thầy cô).
- `GET /points/periods/{code}/group-completion` (Admin / quyền `POINT`) và `GET /leader/completion?period=` (Leader nhóm mình) trả `[{ name, groupKind, done, total, rate, passed, leader, deputy }]`.
- `GET /points/periods/{code}/report`: dữ liệu báo cáo PDF mùng 10, gồm bảng tổng hợp, `entriesByMember` (từng dòng điểm và nguồn) và `completion`. FE in ra PDF ở trang `/admin-points/report?period=`.

**HLC Fund**
- Khoản đóng có thêm các trường:
  - `cycleType` (`ONCE` | `WEEKLY` | `MONTHLY`);
  - `coverUntil` ("đóng đến ngày": bao phủ các tuần từ ngày đóng tới ngày này);
  - `contributorId` (thầy cô ngoài danh sách);
  - `isProxy`, `submittedBy`, `proxyByName` (người nộp hộ);
  - `payerKind` (`MTO` | `MTE` | `EXTERNAL`).
- Thầy cô ngoài danh sách:
  - `GET /fund/contributors?groupId=`, `POST /fund/contributors`, `PUT /fund/contributors/{id}` với `{ fullName, organization?, contact?, groupId, note? }`.
  - Admin HLC Fund quản lý tất cả; Leader nhóm Fund chỉ quản lý nhóm mình.
- Nộp hộ: `POST /fund/groups/contributions` với `{ memberId | contributorId, contributionDate, amount, cycleType, coverUntil?, fileIds }`.
  - Người được nộp hộ: Leader/Phó (khi được bật quyền) cho nhóm mình, hoặc Admin HLC Fund.
  - Khoản của thầy cô bắt buộc `cycleType`.
- `GET /fund/groups/report?kind=FUND|MENTEE`:
  - nhóm Fund liệt kê cả thầy cô;
  - mỗi người có `paidUntil` (đã đóng đến ngày);
  - trạng thái tuần tính theo khoản bao phủ tuần đó.
- Sổ thu chi chung (Admin / quyền `FUND`):
  - `GET /fund/ledger?year=&quarter=&kind=MTO|MTE|EXTERNAL` trả `{ totals: { income, expense, net, balance }, byMonth[{ income: { MTO, MTE, EXTERNAL, total }, expense }], byQuarter, expenses }`;
  - khoản chi: `POST` / `PUT` / `DELETE /fund/expenses[/{id}]` với `{ expenseDate, amount, description, category? }`.

**Dữ liệu mentoring quý cũ** (Admin / quyền `MENTORING`)
- `GET /mentoring/history/export.xlsx?quarter=2023Q1`: file mẫu chuẩn (sheet `MENTORING_QUY_CU`) kèm dữ liệu sẵn có của quý. Mỗi dòng là một buổi gồm: tháng, mã MTO/MTE, giờ, recap MTO (nội dung, ngày nộp, Duyệt/Không duyệt), recap MTE (nội dung, ngày nộp, điểm 0–100).
- `POST /mentoring/history/import?quarter=&dryRun=` (multipart `file`, `reason?`) trả `{ valid, applied, errors, rows, batchId }`.
  - **Server kiểm tra:** đúng mẫu và quý; mã MTO/MTE tồn tại; mỗi MTE chỉ ghép 1 MTO trong quý; không trùng dòng (cùng MTE, cùng tháng); buổi đã có lịch hoặc recap thì không nhập đè; giờ nằm trong tháng; định dạng ngày và điểm hợp lệ.
  - Một dòng lỗi là từ chối cả file.
  - Recap nhập vào ghi `proxy` với lý do "Nhập dữ liệu quý cũ (…)".
  - Lần nhập **không** tự tính điểm. Admin chủ động bấm Tính lại kỳ (chưa chốt) nếu muốn tính.
- `GET /mentoring/history/batches`; `POST /mentoring/history/batches/{id}/revert`: hoàn tác cả lô, xóa cặp, lịch và recap do lô tạo. Hoàn tác lần hai nhận `409`.

**Thư viện HLC** (Admin / quyền `LEARNING_MODULE`)
- `GET /learning/library/export.xlsx`: file (sheet `THU_VIEN_HLC`) với các cột Loại, Tên sách, Tác giả, Thể loại, Mô tả, Link Google Drive (PDF), Link tham khảo khác.
- `POST /learning/library/import?dryRun=` (multipart `file`) trả `{ added, duplicates, errors, applied }`.
  - Link Drive phải có dạng `https://drive.google.com/file/d/…` hoặc `open?id=…`.
  - Trùng tên và tác giả (không phân biệt dấu, hoa thường) hoặc trùng link sẽ được cảnh báo và bỏ qua.
  - Dòng lỗi bị bỏ qua, dòng hợp lệ vẫn được thêm.

### 11.14 Cập nhật vòng 3 (vai trò, phụ cấp tháng, ghép/xóa cặp)

**Vai trò = chức vụ + quyền hạn + điểm** (thay cho phân quyền và gán chức vụ tách rời)
- `GET /roles`, `POST /roles`, `PUT /roles/{id}` (Admin tổng). Body gồm:
  - `{ code, name, appliesTo, permissions?, allowancePoints?, bonusPoints?, adminScope?, description?, isActive? }`;
  - `appliesTo` **bắt buộc**: `MENTEE` (nhóm MTE), `FUND` (nhóm HLC Fund của MTO và thầy cô) hoặc `BAN` (chức vụ ban, không gắn nhóm);
  - `permissions`: `VIEW_PROGRESS`, `SCORE_RECAP` (chỉ nhóm MTE), `REVIEW_FUND`, `PROXY_FUND`;
  - `adminScope` (chỉ vai trò `BAN`): `FUND` | `MENTORING` | `POINT`. Ai giữ vai trò này thì có quyền quản trị tương ứng; `/access/me` có `scopes` tính cả nguồn này.
- Vai trò mặc định:

  | Mã | Áp dụng cho | Phụ cấp | Thưởng |
  |---|---|---|---|
  | `LEADER`, `PHO_LEADER` | Nhóm MTE | 2 / 1 điểm | +1 |
  | `FUND_LEADER`, `FUND_PHO_LEADER` | Nhóm HLC Fund | 2 / 1 điểm | +1 |
  | `ADMIN_HLC_FUND`, `ADMIN_MENTORING` | Ban | — | — |

- `GET` / `PUT /roles/thresholds/all` với `{ MENTEE: 90, FUND: 90 }`: ngưỡng % **theo loại nhóm**. Điểm thưởng được cộng khi tỷ lệ hoàn thành **vượt** ngưỡng.
- Gán vai trò trong nhóm (có thời gian hiệu lực):
  - `POST /groups/{id}/assignments` với `{ memberId, positionId, startDate?, endDate?, note? }`. Vai trò khác loại nhóm nhận `400 error-role-kind-mismatch`. Người đang giữ vai trò đó được kết thúc từ ngày bàn giao.
  - `PUT /groups/assignments/{assignmentId}/end` với `{ endDate? }`.
  - `GET /groups` trả thêm `roles[]` (vai trò, người giữ, `startDate`, `endDate`).
- Điểm phụ cấp chức vụ và điểm thưởng tính theo cấu hình vai trò, qua rule `POSITION_ALLOWANCE` / `POSITION_COMPLETION_BONUS`; các rule `POSITION_*` cũ đã tắt.
  - Dòng điểm ghi rõ nguồn, ví dụ "Phụ cấp chức vụ: Leader nhóm MTE - Nhóm 1" hoặc "Thưởng đạt tỷ lệ: … hoàn thành 9/10 (90%) vượt ngưỡng 85%".
  - Leader và Phó nhóm HLC Fund không phải thành viên, nên không nằm trong mẫu số.

**Phụ cấp tháng**
- Mã bảng là `PC-YYYY-MM` (`sheetCode` trong kỳ). Dùng cho màn hình, tên file Excel/CSV và báo cáo PDF.
- Hệ thống tự tạo kỳ của tháng mới (khi khởi động và lúc 01:00 hằng ngày).
- Mỗi dòng điểm thuộc đúng 1 kỳ.
- Trạng thái kỳ: `LOCKED` / `EXPORTED` = **Đang chờ chi**, `PAID` = **Đã chi**.
- `PUT /points/periods/{code}/settings` với `{ pointRate?, baseAllowance?, payoutDate?, reason? }`:
  - nhận cả số dạng chuỗi;
  - dữ liệu sai trả `400 error-validation-failed` kèm thông báo tiếng Việt, ví dụ "Đơn giá không được âm";
  - mỗi thay đổi được ghi nhật ký;
  - kỳ đã chốt nhận `409`.
  - Đơn giá lưu riêng theo kỳ. Kỳ trả về `pointRate`, `baseAllowance` dạng số.
- `POST /points/periods/{code}/unlock` **bắt buộc** `{ reason }` và ghi nhật ký. Kỳ đã chi không mở khóa được.
- `GET /points/periods/{code}/logs`: nhật ký `{ action: SETTINGS | LOCK | UNLOCK | PAID | EXPORT | CARRY_OVER, field, oldValue, newValue, reason, changedByName, createdAt }`.
- `GET /points/periods/{code}/export.xlsx` (hoặc `.csv`) xuất **bảng cơ bản** giống màn hình: tên, các cột điểm, tổng điểm, đơn giá, phụ cấp cơ bản, bù chênh lệch, thành tiền, tài khoản.
  - Xuất được cả khi chưa chốt; khi đó tên file có hậu tố `-tam-tinh`.
  - Tên file là `PC-YYYY-MM.xlsx`.
- **Bù chênh lệch** cho kỳ đã chốt hoặc đã chi: `POST /points/periods/{code}/carry-over` với `{ memberId, amount? | points?, reason }`.
  - Bảng cũ không bị sửa. Hệ thống ghi một dòng điều chỉnh (`kind: CARRY_OVER`) ở kỳ kế tiếp, kèm tháng gốc, lý do và người duyệt.
  - Bù bằng tiền thì cộng vào `adjustmentAmount` của bảng tháng sau; bù bằng điểm thì tính theo đơn giá tháng sau.
  - Kỳ gốc chưa chốt nhận `409 error-carry-over-source-open`.

**Ghép / xóa cặp lan trong quý**
- Ghép ở tháng x thì tự sinh các tháng sau x trong cùng quý, không tạo ngược về trước. Kết quả trả về `{ syncedMonths, existingMonths, lockedMonths }`:
  - `existingMonths`: tháng đã có cặp này, nên không tạo trùng;
  - `lockedMonths`: tháng đã chốt phụ cấp, nên không tự thêm.
  - Ghép thẳng vào một tháng đã chốt nhận `409 error-pair-month-locked`.
- `GET /mentoring/sessions/{id}/delete-preview` trả `{ deleteMonths, keptLockedMonths, counts: { sessions, schedules, recaps, scoredRecaps, attachments, awards, pointEntries }, willDeletePair }` để hiện màn hình xác nhận.
- `DELETE /mentoring/sessions/{id}` xóa sạch cặp ở tháng này và các tháng sau **chưa chốt**: lịch, recap, điểm chấm, ảnh, giải và dòng điểm phụ cấp phát sinh. Tháng đã chốt hoặc đã chi được giữ nguyên (xử lý bằng bù chênh lệch). Điểm các tháng bị tác động được tính lại; nhật ký lịch được giữ lại.
- `GET /mentoring/pair-logs?quarter=2026Q4`: nhật ký ghép và xóa gồm ai, cặp nào, từ tháng nào, các tháng bị tác động và số bản ghi.

### 11.15 Cập nhật vòng 4 (phân quyền theo chức vụ, xóa nhóm, gán module, hồ sơ, gợi ý ghép cặp)

**Điểm phụ cấp: mỗi chức vụ chỉ sinh một khoản điểm (phương án B)**
- Điểm chức vụ và thưởng đạt tỷ lệ chỉ cấu hình ở **Vai trò & điểm**.
- Hệ thống chỉ dùng 2 rule `POSITION_ALLOWANCE` và `POSITION_COMPLETION_BONUS` (lấy điểm từ cấu hình vai trò). Mọi rule khác có nguồn `MEMBER_POSITION` hoặc `GROUP_COMPLETION` bị tắt khi khởi động và bị bỏ qua khi tính điểm. Bản sửa chỉ áp dụng từ các kỳ chưa chốt.
- `/point-rule`:
  - `POST` và `DELETE` trả `400 error-rule-create-disabled`.
  - `PUT` chỉ nhận `name`, `pointTypeId`, `points`, `targetMemberType`, `isActive`, `maxPointsPerPeriod`, `effectiveFrom`, `effectiveTo`. Điều kiện là logic hệ thống nên bị bỏ qua.
  - Rule chức vụ trả `400 error-rule-managed-by-role`.

**Quyền theo chức vụ, phạm vi và hành động**
- Phạm vi quản trị mới:
  - `MENTEE`: Trưởng ban MTE, bao gồm cả `POINT`, `LEARNING` và mọi nhóm MTE với đủ quyền nhóm.
  - `LEARNING`: Trưởng ban học tập, quản lý mọi module.
- Quyền cấp hệ thống (chỉ gán cho vai trò cấp ban): `LOCK_PERIOD`, `EDIT_POINTS`, `VIEW_PAYOUT`, `EXPORT_PERSONAL`, `VIEW_ACTIVITY_LOG`.
- Vai trò cấp ban có thêm `scopeKinds` (`MENTEE`, `FUND`): quyền theo nhóm áp dụng cho **mọi** nhóm thuộc các loại đó.
- Vai trò mặc định mới:

  | Mã | Vai trò | Quyền |
  |---|---|---|
  | `TRUONG_BAN_MTE` | Trưởng ban MTE | phạm vi `MENTEE` + chốt kỳ, sửa điểm, xem bảng chi trả |
  | `PHO_BAN_MTE` | Phó ban MTE | chấm, duyệt mọi nhóm MTE |
  | `PHO_BAN_HLC_FUND` | Phó ban HLC Fund | duyệt minh chứng quỹ mọi nhóm |
  | `TRUONG_BAN_HOC_TAP` | Trưởng ban Học tập | phạm vi `LEARNING` |
  | `KE_TOAN` | Kế toán | `VIEW_PAYOUT` |

  `ADMIN_HLC_FUND` và `ADMIN_MENTORING` được đổi tên thành Trưởng ban HLC Fund và Trưởng ban Mentoring.
- `GET /access/me` trả thêm `actions[]`, `mustChangePassword`, `profileUrlEditable`. `leaderGroups[].delegatedFrom` cho biết quyền nào có được nhờ ủy quyền.
- Điểm phụ cấp:
  - Cần `EDIT_POINTS`: đơn giá, tính lại, cộng/trừ điểm, bù chênh lệch, sửa rule.
  - Cần `LOCK_PERIOD`: chốt kỳ, đánh dấu đã chi.
  - Mở khóa kỳ: chỉ Admin toàn cục (`403 error-super-admin-only`).
  - Người chỉ có `VIEW_PAYOUT` chỉ xuất được kỳ đã chốt.
- Chỉ Admin toàn cục được: xóa nhóm, xóa vai trò, mở khóa kỳ, nhập và hoàn tác dữ liệu quý cũ, sửa cấu hình hệ thống.
- **Không tự chấm, tự duyệt cho mình** (`403 error-self-review` hoặc `error-recap-score-conflict`): recap của cặp mình tham gia, khoản quỹ của mình, bài học tập của mình, cộng/trừ điểm cho mình. Áp dụng cả với người có quyền toàn cục là thành viên.

**Ủy quyền tạm thời**
- `GET /delegations?groupId=`: danh sách ủy quyền. Admin xem tất cả; người khác xem ủy quyền mình giao hoặc được nhận.
- `POST /delegations` với `{ groupId, toMemberId, permissions[], startDate, endDate, reason?, fromMemberId? (chỉ Admin) }`.
  - Chỉ giao được quyền theo nhóm mà người ủy quyền đang có ở nhóm đó. Không ủy quyền lại cho người khác.
  - Ủy quyền tự hết hiệu lực khi hết hạn.
- `PUT /delegations/{id}/revoke`: người ủy quyền hoặc Admin thu hồi.
- Khi chấm recap, duyệt quỹ hoặc nộp hộ bằng quyền được ủy quyền, nhật ký ghi `onBehalfOf` ("làm thay cho").

**Nhóm: xóa 2 bước, mỗi thành viên luôn có 1 nhóm**
- `GET /groups/{id}/delete-preview` trả `{ counts: { members, contributors, membershipHistory, roleAssignments, activeRoles, moduleAudiences, finalizedPointEntries, finalizedContributions }, canDelete, mode: HARD | DEACTIVATE, targets[] }`.
- `POST /groups/{id}/transfer` với `{ targetGroupId, memberIds? }`: chuyển hàng loạt sang nhóm cùng loại. Bỏ trống `memberIds` thì chuyển toàn bộ, kể cả thầy cô.
- `DELETE /groups/{id}` với `{ reason? }` (chỉ Admin toàn cục):
  - Nhóm còn người thì nhận `400 error-group-not-empty`.
  - Nhóm có dữ liệu đã chốt thì chỉ chuyển sang **ngừng hoạt động**, không xóa cứng.
- `DELETE /groups/{id}/members/{memberId}` chỉ dùng cho thành viên đã ngừng hoạt động. Thành viên đang hoạt động nhận `400 error-member-needs-group`: hãy chuyển nhóm.
- `PUT /groups/assignments/{id}/end` với `{ endDate, reason? }`: gỡ chức vụ bằng cách ghi ngày kết thúc hiệu lực, có nhật ký.
- `DELETE /roles/{id}`:
  - Còn người đang giữ: `400 error-role-in-use` (kèm số người).
  - Đã từng gán: chuyển sang ngừng dùng.
  - Chưa từng gán: xóa hẳn.
  - Leader / Phó nhóm mặc định: `error-role-system`.
- Trưởng ban MTE (phạm vi `MENTEE`) dùng được các API `/groups` cho **nhóm MTE**.

**Nhật ký thao tác và cấu hình**
- `GET /activity-logs?module=&action=&from=&to=&keyword=&limit=`: dành cho Admin toàn cục hoặc người có `VIEW_ACTIVITY_LOG`.
- `GET /system-config` (mọi tài khoản) và `PUT /system-config` (Admin toàn cục) với `{ forcePasswordChangeOnFirstLogin, memberCanEditProfileUrl }`. Cả hai mặc định tắt.

**Hồ sơ cá nhân**
- `PUT /user/me/password` với `{ oldPass, newPass, confirmPass }`.
  - Mật khẩu mới tối thiểu 8 ký tự, có cả chữ và số (`error-password-weak`), và khác mật khẩu hiện tại.
  - Xác nhận không khớp trả `error-password-confirm`.
  - Đổi thành công thì ghi `passwordChangedAt`.
- Link profile: thành viên tự sửa trả `403 error-profile-url-admin-only`, trừ khi công tắc `memberCanEditProfileUrl` đang bật. Admin sửa thì được ghi lịch sử, có `changedByName`.
- Quê quán và địa chỉ dùng `hometownCode` / `addressCode` (mã trong danh mục), kèm `major` / `occupation` để gợi ý ghép cặp.
- Danh mục tỉnh: `GET /provinces?all=` và `PUT /provinces` (Admin) với `{ code, name, aliases[], mergedInto?, isActive? }`.
  - Danh mục mặc định có 34 tỉnh, thành phố, kèm tên 63 tỉnh cũ làm cách viết khác.
  - Dữ liệu nhập tự do được quy đổi khi khởi động và mỗi lần lưu danh mục. Hồ sơ không khớp được đánh dấu "Cần chọn lại tỉnh".

**Xuất danh sách thành viên**
- `GET /member-export/members.xlsx?type=MENTEE|MENTOR` xuất hồ sơ, nhóm MTE, nhóm HLC Fund, chức vụ đang giữ và trạng thái.
- Thông tin cá nhân (ngày sinh, SĐT, email, quê quán, địa chỉ, số tài khoản) chỉ có khi người xuất là Admin hoặc có `EXPORT_PERSONAL`. Trưởng ban MTE không có quyền này sẽ nhận bản cơ bản.
- Mỗi lần xuất được ghi nhật ký.

**Học tập: gán module cho người cụ thể**
- `GET` / `PUT /learning/modules/{id}/audience` với `{ mode: ALL | SELECTED, memberIds[], groupIds[] }`.
- Module chế độ `SELECTED`:
  - Chỉ người được gán (trực tiếp hoặc qua nhóm) mới thấy và nộp bài.
  - Người không được gán không bị tính thiếu bài khi tính tỷ lệ hoàn thành, thưởng và màn hình Leader.
  - Bài đã nộp được giữ khi bớt người.

**Mentoring: gợi ý**
- `GET /mentoring/quarters/{code}/pair-suggestions?criteria=major,occupation,location,hometown,preference&menteeId=&limit=5`: điểm tương đồng kèm lý do cho từng MTO gợi ý.
  - MTO đã có cặp bị giảm thứ hạng, kèm `warning` "MTO này đã có X cặp". Hệ thống không chặn ghép.
  - Thời gian tính khoảng 20 ms với quy mô hiện tại, nên vẫn tính tức thời và chưa cần tách thành dịch vụ riêng.
- `GET /mentoring/group-plan?kind=MENTEE`: phương án chia nhóm cân bằng số người và mức hoạt động (điểm 3 tháng gần nhất). Người giữ vai trò giữ nguyên nhóm.
- `POST /mentoring/group-plan/apply` với `{ kind, assignments: [{ memberId, groupId }] }`: áp dụng phương án sau khi Admin chỉnh tay.

**Nhóm HLC Fund của thầy cô / MTO**
- `/leader/overview` trả `groupKind`. Nhóm `FUND` chỉ có dữ liệu quỹ; `mentoring` và `learning` để trống.

### 11.16 Cập nhật vòng 5 (chi phụ cấp vào sổ quỹ, Dashboard thu chi, thêm thành viên, mở khóa kỳ)

**Xác nhận đã chi → sổ quỹ**
- `POST /points/periods/{code}/paid` với `{ paidDate? }` (ngày chi thực tế, mặc định hôm nay).
  - Cần quyền `CONFIRM_PAYOUT`: Admin toàn cục, hoặc người giữ vai trò có phạm vi `FUND` (Trưởng ban HLC Fund). Quyền này tách riêng khỏi chốt kỳ và sửa điểm.
  - Kỳ phải đang chốt. Ngày chi không được trước ngày đầu kỳ (`error-payout-date-invalid`).
- Lần đầu xác nhận, hệ thống sinh **1** `FundExpense`:
  - Các trường: `source: ALLOWANCE`, `periodId` (unique), `sheetCode: PC-YYYY-MM`, `expenseDate = paidDate`, `amount` = tổng bảng tổng hợp (khớp Excel và PDF).
  - `detail` gồm `members` và `carryOvers[]` (các dòng bù chênh lệch kèm lý do, ghi ở tháng được bù).
- Xác nhận lại sau khi mở khóa: không sinh thêm khoản chi, giữ ngày chi cũ, trả `{ created: false, difference }` (chênh lệch so với số đã ghi sổ). Phần chênh lệch ghi bằng `POST /points/periods/{code}/carry-over`.
- Khoản chi phụ cấp không sửa hoặc xóa tay được (`error-expense-allowance-managed`).
- `GET /points/periods/{code}/summary` trả thêm `payout`, là khoản chi đã ghi sổ.
- Các kỳ đã "Đã chi" từ trước khi có tính năng này được tự sinh khoản chi khi khởi động.

**Dashboard thu chi**
- `GET /fund/ledger?year=&quarter=&month=&kind=&groupKind=MENTEE|FUND`.
  - Thu tính theo ngày đóng. Chi tính theo **ngày chi thực tế**.
  - `totals` gồm `income`, `incomeByKind {MTE, MTO, EXTERNAL}`, `expense`, `expenseByType {ALLOWANCE, OTHER}`, `net`, `balance`.
  - Trả thêm `byMonth[]` và `byQuarter[]`.
  - `allowancePeriods[]`: đối chiếu theo kỳ phụ cấp, gồm `summaryAmount`, `recordedAmount`, `paidDate`, `carryOverTotal`, `difference`.
- Phụ cấp tháng 9 chi ngày 10/10 thì nằm ở tháng 10 của sổ quỹ.

**Mở khóa kỳ (giai đoạn thử nghiệm)**
- `POST /points/periods/{code}/unlock` với `{ reason }`: chỉ Admin toàn cục, bắt buộc lý do, có nhật ký, không phụ thuộc lịch ngày.
  - Mở khóa xong hệ thống tự tính lại bảng.
  - Kỳ đã chi chỉ mở được khi công tắc `allowUnlockPaidPeriod` đang bật (mặc định bật cho giai đoạn thử nghiệm). Tắt khi lên production; lúc đó kỳ đã chi trả `409 error-period-paid-unlock-disabled`.
  - Khoản chi đã ghi sổ giữ nguyên khi mở khóa.
- `GET` / `PUT /system-config` có thêm `allowUnlockPaidPeriod`.

**Đổi mật khẩu lần đầu ở API**
- Khi `forcePasswordChangeOnFirstLogin` bật và tài khoản chưa tự đổi mật khẩu, mọi API trả `403 error-password-change-required`.
- Ngoại lệ (vẫn gọi được): `GET /user/me`, `PUT /user/me/password`, `GET /access/me`, `GET /system-config`, `GET /member/me(/profile)`, `GET /time/mock`, `GET /provinces`. Admin toàn cục không bị chặn.

**Sửa đơn giá**
- `PUT /points/periods/{code}/settings` bắt buộc `reason`.

**Thêm thành viên (chỉ Admin toàn cục)**
- `GET /member-admin/next-code?type=MENTEE|MENTOR` trả `{ code, method: COUNT | MAX_PLUS_ONE, total, maxSequence, warning }`.
  - Mã dạng `HLC-MTE|MTO-xxxxx`, dùng một dãy số chung cho cả MTE và MTO.
  - Cách tính chính: tổng hồ sơ (kể cả ngừng hoạt động) + 1.
  - Nếu không khớp số lớn nhất + 1, hoặc mã đã tồn tại: cảnh báo và dùng số lớn nhất + 1. Vẫn trùng thì trả `409 error-member-code-conflict`.
- `POST /member-admin/precheck` trả mã sẽ cấp và các hồ sơ trùng họ tên + ngày sinh (kể cả ngừng hoạt động). CCCD trùng thì trả `409 error-national-id-duplicate`.
- `POST /member-admin/members` với `{ fullName, gender, dateOfBirth, memberType, hometownCode, addressCode, phone, email, nationalId?, bankAccount?, bankName?, groupId?, confirmDuplicate? }`.
  - Thành viên MTE bắt buộc có `groupId` là một nhóm MTE.
  - `bankName` phải thuộc `GET /member-admin/banks`.
  - Trùng họ tên + ngày sinh mà chưa gửi `confirmDuplicate` thì trả `409 error-member-possible-duplicate`.
  - Mã được cấp dưới advisory lock của Postgres, nên 2 lần thêm cùng lúc không nhận trùng mã.
  - Hệ thống tạo tài khoản với `username` = mã viết thường và mật khẩu khởi tạo ngẫu nhiên. Mật khẩu **chỉ trả 1 lần** trong `account`; máy chủ chỉ lưu mã băm.
  - Mỗi lần thêm được ghi nhật ký `MEMBER_CREATE`.
- Dữ liệu nhạy cảm:
  - `nationalId` (CCCD, unique) và `bankAccount` bị che (`•••123`) trong `GET /member`, `/member/many`, `/member/{id}`.
  - Xem đầy đủ qua `GET /member-admin/members/{id}/sensitive` (có nhật ký `MEMBER_SENSITIVE_VIEW`). Chính chủ xem đầy đủ ở `/member/me/profile`.
  - Gửi lại giá trị đã che thì máy chủ bỏ qua, không ghi đè dữ liệu thật.
  - File xuất thành viên chỉ có cột CCCD khi người xuất là Admin toàn cục.
- Danh bạ rút gọn (mọi tài khoản đăng nhập, không có dữ liệu nhạy cảm): `GET /member-directory?type=` và `GET /member-directory/groups`.

---

## 12. Danh mục resource

Cột **Quyền**: `Admin` = chỉ Admin tổng; `Admin + SCOPE` = Admin tổng hoặc người có scope đó (mục 4).

| Nhóm | Route | Mô tả | Quyền | Kiểu |
|---|---|---|---|---|
| Thành viên & tổ chức | [`/member`](#member) | Hồ sơ mentee / mentor | Admin | CRUD + import |
| Thành viên & tổ chức | [`/department`](#department) | Ban, nhóm | Admin | CRUD |
| Thành viên & tổ chức | [`/position`](#position) | Danh mục chức vụ (trưởng ban, phó ban, leader, phó leader) | Admin | CRUD |
| Thành viên & tổ chức | [`/member-position`](#member-position) | Chức vụ của thành viên, có thời hạn hiệu lực | Admin | CRUD |
| Thành viên & tổ chức | [`/period`](#period) | Kỳ tháng: đơn vị tính điểm và chi trả phụ cấp | Admin | CRUD |
| Thành viên & tổ chức | [`/admin-permission`](#admin-permission) | Quyền admin theo phạm vi (mục 4.2) | Admin | CRUD |
| Mentoring | [`/mentoring-quarter`](#mentoring-quarter) | Quý mentoring và các mốc thời gian | Admin + `MENTORING` | CRUD |
| Mentoring | [`/mentor-preference`](#mentor-preference) | Nguyện vọng chọn mentor của mentee cho một quý | Admin + `MENTORING` | CRUD |
| Mentoring | [`/mentor-preference-item`](#mentor-preference-item) | Từng mentor trong nguyện vọng (3–10 mentor, có thứ tự ưu tiên) | Admin + `MENTORING` | CRUD |
| Mentoring | [`/mentoring-pair`](#mentoring-pair) | Cặp mentor–mentee trong một quý | Admin + `MENTORING` | CRUD |
| Mentoring | [`/mentoring-session`](#mentoring-session) | Buổi mentoring theo tháng của một cặp, kèm lịch đã chốt | Admin + `MENTORING` | CRUD |
| Mentoring | [`/mentoring-schedule-log`](#mentoring-schedule-log) | Lịch sử gửi/sửa lịch | Admin + `MENTORING` | 📖 chỉ đọc |
| Mentoring | [`/mentoring-recap`](#mentoring-recap) | Recap của mentor / mentee cho một buổi | Admin + `MENTORING` | CRUD |
| Mentoring | [`/mentoring-award`](#mentoring-award) | Kết quả giải nhất/nhì/ba của tháng | Admin + `MENTORING` | CRUD |
| Học tập | [`/learning-module`](#learning-module) | Module học tập (đọc sách, bài tâm đắc, ban học tập…) | Admin | CRUD |
| Học tập | [`/module-field`](#module-field) | Các ô của form nộp bài trong một module | Admin | CRUD |
| Học tập | [`/module-criterion`](#module-criterion) | Tiêu chí chấm bài của module | Admin | CRUD |
| Học tập | [`/module-assignment`](#module-assignment) | Đề bài cụ thể theo chu kỳ (tùy chọn) | Admin | CRUD |
| Học tập | [`/library-item`](#library-item) | Thư viện sách (`BOOK`) và tài liệu ban học tập (`DOCUMENT`) | Admin | CRUD + import |
| Học tập | [`/submission`](#submission) | Bài nộp của mọi module | Admin | CRUD |
| Học tập | [`/submission-score`](#submission-score) | Điểm chấm bài theo từng tiêu chí | Admin | CRUD |
| Học tập | [`/submission-unique-value`](#submission-unique-value) | Giá trị đã nộp dùng để chặn trùng (ví dụ link YouTube) | Admin | 📖 chỉ đọc |
| Quỹ & đính kèm | [`/fund-contribution`](#fund-contribution) | Minh chứng đóng quỹ HLC Fund (mỗi lần nộp tiền 1 bản ghi) | Admin + `FUND` | CRUD |
| Quỹ & đính kèm | [`/attachment`](#attachment) | File/ảnh đính kèm của recap, bài nộp, minh chứng quỹ, thư viện (mục 8) | Admin | CRUD |
| Điểm & phụ cấp | [`/point-type`](#point-type) | Loại điểm phụ cấp (cột của bảng tổng hợp) | Admin + `POINT` | CRUD |
| Điểm & phụ cấp | [`/point-rule`](#point-rule) | Quy tắc tính điểm phụ cấp | Admin + `POINT` | CRUD |
| Điểm & phụ cấp | [`/point-adjustment`](#point-adjustment) | Cộng/trừ điểm thủ công và khiếu nại | Admin + `POINT` | CRUD |
| Điểm & phụ cấp | [`/point-entry`](#point-entry) | Sổ cái điểm phụ cấp (hệ thống sinh) | Admin + `POINT` | 📖 chỉ đọc |
| Điểm & phụ cấp | [`/allowance-summary`](#allowance-summary) | Bảng tổng hợp điểm và tiền phụ cấp theo kỳ (hệ thống sinh) | Admin + `POINT` | 📖 chỉ đọc |
| Điểm & phụ cấp | [`/period-export`](#period-export) | Lịch sử file Excel/CSV đã xuất | Admin + `POINT` | 📖 chỉ đọc |

---

## 13. Chi tiết trường của từng resource

Bảng dưới là **body khi tạo mới** (`POST`). Response trả về cùng các trường này, cộng thêm `_id`, `createdAt`, `updatedAt`. Cột *Bắt buộc* chỉ áp dụng khi tạo mới.

### Thành viên & tổ chức

#### `member`

<a id="member"></a>Hồ sơ mentee / mentor. Route: `/member` · Quyền: Admin

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `userId` | id |  | Tài khoản | `_id` của bản ghi liên kết |
| `memberCode` | string | ✔ | Mã thành viên | ≤ 20 ký tự |
| `memberType` | enum | ✔ | Loại thành viên | `MENTEE` \| `MENTOR` |
| `fullName` | string | ✔ | Họ và tên | ≤ 255 ký tự |
| `dateOfBirth` | date YYYY-MM-DD |  | Ngày sinh |  |
| `gender` | enum |  | Giới tính | `MALE` \| `FEMALE` \| `OTHER` |
| `phone` | string |  | Số điện thoại | ≤ 20 ký tự |
| `email` | string |  | Email | ≤ 255 ký tự |
| `profileUrl` | string |  | Link profile |  |
| `bankAccount` | string |  | Số tài khoản | ≤ 50 ký tự |
| `bankName` | string |  | Ngân hàng | ≤ 255 ký tự |
| `livingAllowanceType` | string |  | Loại phụ cấp sinh hoạt | ≤ 100 ký tự |
| `joinedAt` | date YYYY-MM-DD |  | Ngày tham gia |  |
| `allowanceStartDate` | date YYYY-MM-DD |  | Ngày bắt đầu phụ cấp |  |
| `status` | enum |  | Trạng thái | `ACTIVE` \| `INACTIVE` |
| `note` | string |  | Ghi chú |  |

#### `department`

<a id="department"></a>Ban, nhóm. Route: `/department` · Quyền: Admin

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `code` | string | ✔ | Mã ban | ≤ 50 ký tự |
| `name` | string | ✔ | Tên ban | ≤ 255 ký tự |
| `type` | enum |  | Loại | `ACADEMIC` \| `FUND` \| `MENTORING` \| `GROUP` \| `OTHER` |
| `parentId` | id |  | Ban cha | `_id` của bản ghi liên kết |
| `isActive` | boolean |  | Đang hoạt động |  |

#### `position`

<a id="position"></a>Danh mục chức vụ (trưởng ban, phó ban, leader, phó leader). Route: `/position` · Quyền: Admin

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `code` | string | ✔ | Mã chức vụ | ≤ 50 ký tự |
| `name` | string | ✔ | Tên chức vụ | ≤ 255 ký tự |
| `sortOrder` | integer |  | Thứ tự |  |
| `isActive` | boolean |  | Đang hoạt động |  |

#### `member-position`

<a id="member-position"></a>Chức vụ của thành viên, có thời hạn hiệu lực. Route: `/member-position` · Quyền: Admin

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `memberId` | id | ✔ | Thành viên | `_id` của bản ghi liên kết |
| `departmentId` | id | ✔ | Ban | `_id` của bản ghi liên kết |
| `positionId` | id | ✔ | Chức vụ | `_id` của bản ghi liên kết |
| `startDate` | date YYYY-MM-DD | ✔ | Từ ngày |  |
| `endDate` | date YYYY-MM-DD |  | Đến ngày |  |
| `note` | string |  | Ghi chú |  |

#### `period`

<a id="period"></a>Kỳ tháng: đơn vị tính điểm và chi trả phụ cấp. Route: `/period` · Quyền: Admin

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `code` | string | ✔ | Mã kỳ | ≤ 7 ký tự |
| `year` | integer | ✔ | Năm |  |
| `month` | integer | ✔ | Tháng |  |
| `startDate` | date YYYY-MM-DD | ✔ | Ngày bắt đầu |  |
| `endDate` | date YYYY-MM-DD | ✔ | Ngày kết thúc |  |
| `status` | enum |  | Trạng thái | `OPEN` \| `CALCULATING` \| `REVIEWING` \| `LOCKED` \| `EXPORTED` \| `PAID` |
| `pointRate` | number |  | Đơn giá điểm |  |
| `baseAllowance` | number |  | Phụ cấp cơ bản |  |
| `payoutDate` | date YYYY-MM-DD |  | Ngày chi trả |  |
| `lockedAt` | datetime ISO 8601 |  | Thời điểm khóa |  |
| `lockedBy` | id |  | Người khóa | `_id` của bản ghi liên kết |

#### `admin-permission`

<a id="admin-permission"></a>Quyền admin theo phạm vi (mục 4.2). Route: `/admin-permission` · Quyền: Admin

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `userId` | id | ✔ | Tài khoản | `_id` của bản ghi liên kết |
| `scope` | enum | ✔ | Phạm vi | `LEARNING_MODULE` \| `FUND` \| `MENTORING` \| `POINT` |
| `moduleId` | id |  | Module học tập | Bắt buộc khi scope = LEARNING_MODULE, để trống với các phạm vi khác |
| `grantedBy` | id |  | Người cấp quyền | `_id` của bản ghi liên kết |
| `note` | string |  | Ghi chú |  |

### Mentoring

#### `mentoring-quarter`

<a id="mentoring-quarter"></a>Quý mentoring và các mốc thời gian. Route: `/mentoring-quarter` · Quyền: Admin + `MENTORING`

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `code` | string | ✔ | Mã quý | ≤ 6 ký tự |
| `year` | integer | ✔ | Năm |  |
| `quarter` | integer | ✔ | Quý |  |
| `startDate` | date YYYY-MM-DD | ✔ | Ngày bắt đầu |  |
| `endDate` | date YYYY-MM-DD | ✔ | Ngày kết thúc |  |
| `preferenceOpenAt` | datetime ISO 8601 | ✔ | Mở nguyện vọng |  |
| `pairingOpenAt` | datetime ISO 8601 | ✔ | Mở ghép cặp |  |
| `visibleAt` | datetime ISO 8601 | ✔ | Công bố cặp |  |
| `status` | enum |  | Trạng thái | `DRAFT` \| `PAIRING` \| `ACTIVE` \| `CLOSED` |
| `isLocked` | boolean |  | Đã khóa |  |
| `lockedAt` | datetime ISO 8601 |  | Thời điểm khóa |  |
| `lockedBy` | id |  | Người khóa | `_id` của bản ghi liên kết |
| `createdBy` | id |  | Người tạo | `_id` của bản ghi liên kết |

#### `mentor-preference`

<a id="mentor-preference"></a>Nguyện vọng chọn mentor của mentee cho một quý. Route: `/mentor-preference` · Quyền: Admin + `MENTORING`

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `quarterId` | id | ✔ | Quý | `_id` của bản ghi liên kết |
| `menteeId` | id | ✔ | Mentee | `_id` của bản ghi liên kết |
| `message` | string |  | Lời nhắn | ≤ 500 ký tự |
| `submittedAt` | datetime ISO 8601 | ✔ | Thời điểm gửi |  |
| `isLateJoiner` | boolean |  | Tham gia muộn |  |

#### `mentor-preference-item`

<a id="mentor-preference-item"></a>Từng mentor trong nguyện vọng (3–10 mentor, có thứ tự ưu tiên). Route: `/mentor-preference-item` · Quyền: Admin + `MENTORING`

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `preferenceId` | id | ✔ | Nguyện vọng | `_id` của bản ghi liên kết |
| `mentorId` | id | ✔ | Mentor | `_id` của bản ghi liên kết |
| `priority` | integer | ✔ | Thứ tự ưu tiên |  |

#### `mentoring-pair`

<a id="mentoring-pair"></a>Cặp mentor–mentee trong một quý. Route: `/mentoring-pair` · Quyền: Admin + `MENTORING`

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `quarterId` | id | ✔ | Quý | `_id` của bản ghi liên kết |
| `mentorId` | id | ✔ | Mentor | `_id` của bản ghi liên kết |
| `menteeId` | id | ✔ | Mentee | `_id` của bản ghi liên kết |
| `code` | string | ✔ | Mã cặp | ≤ 64 ký tự |
| `status` | enum |  | Trạng thái | `ACTIVE` \| `ENDED` \| `CANCELLED` |
| `source` | enum |  | Nguồn ghép | `MANUAL` \| `IMPORT` \| `INHERIT` \| `SUGGEST` |
| `sortOrder` | integer |  | Thứ tự |  |
| `note` | string |  | Ghi chú |  |
| `createdBy` | id |  | Người tạo | `_id` của bản ghi liên kết |

#### `mentoring-session`

<a id="mentoring-session"></a>Buổi mentoring theo tháng của một cặp, kèm lịch đã chốt. Route: `/mentoring-session` · Quyền: Admin + `MENTORING`

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `pairId` | id | ✔ | Cặp mentoring | `_id` của bản ghi liên kết |
| `periodId` | id | ✔ | Kỳ tháng | `_id` của bản ghi liên kết |
| `monthIndex` | integer | ✔ | Tháng trong quý |  |
| `code` | string | ✔ | Mã mentoring tháng | ≤ 64 ký tự |
| `status` | enum |  | Trạng thái | `ACTIVE` \| `CANCELLED` |
| `scheduledStartAt` | datetime ISO 8601 |  | Bắt đầu |  |
| `scheduledEndAt` | datetime ISO 8601 |  | Kết thúc |  |
| `firstScheduledStartAt` | datetime ISO 8601 |  | Mốc chốt lịch lần đầu |  |
| `location` | string |  | Địa điểm | ≤ 255 ký tự |
| `meetingLink` | string |  | Link họp |  |
| `scheduleNote` | string |  | Ghi chú lịch |  |
| `scheduleSubmittedBy` | id |  | Người gửi lịch | `_id` của bản ghi liên kết |
| `scheduleSubmittedAt` | datetime ISO 8601 |  | Thời điểm gửi lịch |  |
| `recapDeadlineAt` | datetime ISO 8601 |  | Hạn nộp recap |  |
| `importedStatus` | object (JSON) |  | Trạng thái import |  |

#### `mentoring-schedule-log`

<a id="mentoring-schedule-log"></a>Lịch sử gửi/sửa lịch. Route: `/mentoring-schedule-log` · Quyền: Admin + `MENTORING` · **chỉ đọc**

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `sessionId` | id | ✔ | Buổi mentoring | `_id` của bản ghi liên kết |
| `action` | enum | ✔ | Thao tác | `CREATE` \| `UPDATE` \| `ADMIN_OVERRIDE` \| `CANCEL` |
| `oldStartAt` | datetime ISO 8601 |  | Bắt đầu cũ |  |
| `oldEndAt` | datetime ISO 8601 |  | Kết thúc cũ |  |
| `newStartAt` | datetime ISO 8601 |  | Bắt đầu mới |  |
| `newEndAt` | datetime ISO 8601 |  | Kết thúc mới |  |
| `actorUserId` | id |  | Người thao tác | `_id` của bản ghi liên kết |
| `reason` | string |  | Lý do |  |

#### `mentoring-recap`

<a id="mentoring-recap"></a>Recap của mentor / mentee cho một buổi. Route: `/mentoring-recap` · Quyền: Admin + `MENTORING`

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `sessionId` | id | ✔ | Buổi mentoring | `_id` của bản ghi liên kết |
| `memberId` | id | ✔ | Người viết | `_id` của bản ghi liên kết |
| `role` | enum | ✔ | Vai trò | `MENTOR` \| `MENTEE` |
| `content` | string | ✔ | Nội dung |  |
| `firstSubmittedAt` | datetime ISO 8601 | ✔ | Nộp lần đầu |  |
| `lastSubmittedAt` | datetime ISO 8601 | ✔ | Nộp gần nhất |  |
| `isLate` | boolean | ✔ | Nộp muộn |  |
| `reviewStatus` | enum |  | Trạng thái duyệt | `PENDING` \| `APPROVED` \| `REJECTED` |
| `reviewedBy` | id |  | Người duyệt | `_id` của bản ghi liên kết |
| `reviewedAt` | datetime ISO 8601 |  | Thời điểm duyệt |  |
| `reviewNote` | string |  | Ghi chú duyệt |  |

#### `mentoring-award`

<a id="mentoring-award"></a>Kết quả giải nhất/nhì/ba của tháng. Route: `/mentoring-award` · Quyền: Admin + `MENTORING`

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `periodId` | id | ✔ | Kỳ tháng | `_id` của bản ghi liên kết |
| `sessionId` | id | ✔ | Buổi mentoring | `_id` của bản ghi liên kết |
| `rank` | integer | ✔ | Hạng |  |
| `rankingBasis` | object (JSON) |  | Căn cứ xếp hạng |  |
| `decidedBy` | id |  | Người chốt | `_id` của bản ghi liên kết |
| `decidedAt` | datetime ISO 8601 |  | Thời điểm chốt |  |

### Học tập

#### `learning-module`

<a id="learning-module"></a>Module học tập (đọc sách, bài tâm đắc, ban học tập…). Route: `/learning-module` · Quyền: Admin

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `code` | string | — | Mã module | **Server tự sinh** (`LM-0001`…). Không gửi, không sửa được |
| `name` | string | ✔ | Tên module | ≤ 255 ký tự |
| `description` | string |  | Mô tả |  |
| `departmentId` | id |  | Ban phụ trách | `_id` của bản ghi liên kết |
| `targetMemberType` | enum |  | Đối tượng nộp | `MENTEE` \| `MENTOR` \| `ALL` |
| `cycleType` | enum | ✔ | Chu kỳ | `DAILY` \| `WEEKLY` \| `MONTHLY` \| `ONCE` |
| `minSubmissionsPerCycle` | integer |  | Số bài tối thiểu / chu kỳ |  |
| `maxSubmissionsPerCycle` | integer |  | Số bài tối đa / chu kỳ |  |
| `libraryType` | enum |  | Thư viện gắn kèm | `BOOK` \| `DOCUMENT` |
| `requireReview` | boolean |  | Cần duyệt |  |
| `enableScoring` | boolean |  | Có chấm điểm |  |
| `maxScore` | number |  | Thang điểm chấm bài | > 0; Thang điểm chấm bài (mặc định 100), tách riêng với điểm phụ cấp |
| `allowLateSubmission` | boolean |  | Cho nộp muộn |  |
| `settings` | object (JSON) |  | Cấu hình thêm |  |
| `sortOrder` | integer |  | Thứ tự |  |
| `isActive` | boolean |  | Đang hoạt động |  |
| `createdBy` | id |  | Người tạo | `_id` của bản ghi liên kết |

#### `module-field`

<a id="module-field"></a>Các ô của form nộp bài trong một module. Route: `/module-field` · Quyền: Admin

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `moduleId` | id | ✔ | Module | `_id` của bản ghi liên kết |
| `key` | string | ✔ | Key | ≤ 50 ký tự |
| `label` | string | ✔ | Nhãn | ≤ 255 ký tự |
| `fieldType` | enum | ✔ | Kiểu ô | `TEXT` \| `LONG_TEXT` \| `URL` \| `YOUTUBE_URL` \| `IMAGE` \| `FILE` \| `SELECT` \| `MULTI_SELECT` \| `NUMBER` \| `DATE` \| `LIBRARY_ITEM` |
| `isRequired` | boolean |  | Bắt buộc |  |
| `isUnique` | boolean |  | Chặn trùng |  |
| `options` | array (JSON) |  | Lựa chọn |  |
| `validation` | object (JSON) |  | Ràng buộc |  |
| `sortOrder` | integer |  | Thứ tự |  |
| `isActive` | boolean |  | Đang hoạt động |  |

#### `module-criterion`

<a id="module-criterion"></a>Tiêu chí chấm bài của module. Route: `/module-criterion` · Quyền: Admin

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `moduleId` | id | ✔ | Module | `_id` của bản ghi liên kết |
| `name` | string | ✔ | Tiêu chí | ≤ 255 ký tự |
| `description` | string |  | Mô tả |  |
| `maxScore` | number | ✔ | Điểm tối đa |  |
| `weight` | number |  | Trọng số |  |
| `sortOrder` | integer |  | Thứ tự |  |

#### `module-assignment`

<a id="module-assignment"></a>Đề bài cụ thể theo chu kỳ (tùy chọn). Route: `/module-assignment` · Quyền: Admin

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `moduleId` | id | ✔ | Module | `_id` của bản ghi liên kết |
| `periodId` | id |  | Kỳ tháng | `_id` của bản ghi liên kết |
| `cycleKey` | string | ✔ | Chu kỳ | ≤ 20 ký tự |
| `title` | string | ✔ | Tiêu đề | ≤ 500 ký tự |
| `description` | string |  | Mô tả |  |
| `openAt` | datetime ISO 8601 |  | Mở nộp |  |
| `dueAt` | datetime ISO 8601 |  | Hạn nộp |  |
| `isActive` | boolean |  | Đang hoạt động |  |
| `createdBy` | id |  | Người tạo | `_id` của bản ghi liên kết |

#### `library-item`

<a id="library-item"></a>Thư viện sách (`BOOK`) và tài liệu ban học tập (`DOCUMENT`). Route: `/library-item` · Quyền: Admin

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `libraryType` | enum | ✔ | Loại thư viện | `BOOK` \| `DOCUMENT` |
| `departmentId` | id |  | Ban | `_id` của bản ghi liên kết |
| `title` | string | ✔ | Tiêu đề | ≤ 500 ký tự |
| `author` | string |  | Tác giả | ≤ 255 ký tự |
| `category` | string |  | Thể loại | ≤ 100 ký tự |
| `description` | string |  | Mô tả |  |
| `coverUrl` | string |  | Ảnh bìa |  |
| `fileUrl` | string |  | File |  |
| `externalUrl` | string |  | Link ngoài |  |
| `isActive` | boolean |  | Đang hoạt động |  |
| `createdBy` | id |  | Người tạo | `_id` của bản ghi liên kết |

#### `submission`

<a id="submission"></a>Bài nộp của mọi module. Route: `/submission` · Quyền: Admin

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `moduleId` | id | ✔ | Module | `_id` của bản ghi liên kết |
| `assignmentId` | id |  | Bài tập | `_id` của bản ghi liên kết |
| `memberId` | id | ✔ | Thành viên | `_id` của bản ghi liên kết |
| `periodId` | id | ✔ | Kỳ tháng | `_id` của bản ghi liên kết |
| `cycleKey` | string | ✔ | Chu kỳ | ≤ 20 ký tự |
| `libraryItemId` | id |  | Sách / tài liệu | `_id` của bản ghi liên kết |
| `data` | object (JSON) |  | Nội dung form |  |
| `status` | enum |  | Trạng thái | `DRAFT` \| `SUBMITTED` |
| `submittedAt` | datetime ISO 8601 |  | Thời điểm nộp |  |
| `isLate` | boolean |  | Nộp muộn |  |
| `reviewStatus` | enum |  | Trạng thái duyệt | `NOT_REQUIRED` \| `PENDING` \| `APPROVED` \| `REJECTED` |
| `reviewerId` | id |  | Người duyệt | `_id` của bản ghi liên kết |
| `reviewedAt` | datetime ISO 8601 |  | Thời điểm duyệt |  |
| `feedback` | string |  | Nhận xét |  |
| `totalScore` | number |  | Điểm chấm bài | ≥ 0; Điểm chấm bài theo thang của module, KHÔNG phải điểm phụ cấp |

#### `submission-score`

<a id="submission-score"></a>Điểm chấm bài theo từng tiêu chí. Route: `/submission-score` · Quyền: Admin

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `submissionId` | id | ✔ | Bài nộp | `_id` của bản ghi liên kết |
| `criterionId` | id | ✔ | Tiêu chí | `_id` của bản ghi liên kết |
| `score` | number | ✔ | Điểm |  |
| `comment` | string |  | Nhận xét |  |
| `scoredBy` | id |  | Người chấm | `_id` của bản ghi liên kết |

#### `submission-unique-value`

<a id="submission-unique-value"></a>Giá trị đã nộp dùng để chặn trùng (ví dụ link YouTube). Route: `/submission-unique-value` · Quyền: Admin · **chỉ đọc**

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `moduleId` | id | ✔ | Module | `_id` của bản ghi liên kết |
| `fieldId` | id | ✔ | Ô nhập | `_id` của bản ghi liên kết |
| `submissionId` | id | ✔ | Bài nộp | `_id` của bản ghi liên kết |
| `normalizedValue` | string | ✔ | Giá trị chuẩn hóa | ≤ 500 ký tự |

### Quỹ & đính kèm

#### `fund-contribution`

<a id="fund-contribution"></a>Minh chứng đóng quỹ HLC Fund (mỗi lần nộp tiền 1 bản ghi). Route: `/fund-contribution` · Quyền: Admin + `FUND`

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `memberId` | id | ✔ | Thành viên | `_id` của bản ghi liên kết |
| `periodId` | id | ✔ | Kỳ tháng | `_id` của bản ghi liên kết |
| `contributionDate` | date YYYY-MM-DD | ✔ | Ngày đóng quỹ |  |
| `amount` | number | ✔ | Số tiền | > 0 |
| `note` | string |  | Ghi chú |  |
| `submittedAt` | datetime ISO 8601 | ✔ | Thời điểm gửi |  |
| `status` | enum |  | Trạng thái | `PENDING` \| `DONE` \| `NOT_DONE` |
| `reviewedBy` | id |  | Người duyệt | `_id` của bản ghi liên kết |
| `reviewedAt` | datetime ISO 8601 |  | Thời điểm duyệt |  |
| `reviewNote` | string |  | Ghi chú duyệt |  |

#### `attachment`

<a id="attachment"></a>File/ảnh đính kèm của recap, bài nộp, minh chứng quỹ, thư viện (mục 8). Route: `/attachment` · Quyền: Admin

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `ownerType` | enum | ✔ | Loại bản ghi | `MENTORING_RECAP` \| `SUBMISSION` \| `FUND_CONTRIBUTION` \| `LIBRARY_ITEM` |
| `ownerId` | id | ✔ | Bản ghi | `_id` của bản ghi liên kết |
| `fieldKey` | string |  | Ô nhập | ≤ 50 ký tự |
| `fileId` | id |  | File đã upload | _id của file đã upload qua POST /file |
| `url` | string | ✔ | URL |  |
| `storageKey` | string |  | Storage key |  |
| `fileName` | string |  | Tên file | ≤ 255 ký tự |
| `mimeType` | string |  | Mime type | ≤ 100 ký tự |
| `sizeBytes` | integer |  | Dung lượng (byte) |  |
| `sortOrder` | integer |  | Thứ tự |  |
| `uploadedBy` | id |  | Người tải lên | `_id` của bản ghi liên kết |

### Điểm & phụ cấp

#### `point-type`

<a id="point-type"></a>Loại điểm phụ cấp (cột của bảng tổng hợp). Route: `/point-type` · Quyền: Admin + `POINT`

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `code` | string | ✔ | Mã loại điểm | ≤ 50 ký tự |
| `name` | string | ✔ | Tên loại điểm | ≤ 255 ký tự |
| `category` | enum | ✔ | Nhóm | `MENTORING` \| `POSITION` \| `LEARNING` \| `FUND` \| `BONUS` \| `PENALTY` \| `OTHER` |
| `description` | string |  | Mô tả |  |
| `isAllowance` | boolean |  | Quy đổi ra tiền |  |
| `sortOrder` | integer |  | Thứ tự |  |
| `isActive` | boolean |  | Đang hoạt động |  |

#### `point-rule`

<a id="point-rule"></a>Quy tắc tính điểm phụ cấp. Route: `/point-rule` · Quyền: Admin + `POINT`

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `code` | string | ✔ | Mã rule | ≤ 50 ký tự |
| `name` | string | ✔ | Tên rule | ≤ 255 ký tự |
| `pointTypeId` | id | ✔ | Loại điểm | `_id` của bản ghi liên kết |
| `ruleKind` | enum | ✔ | Kiểu rule | `AUTO` \| `RANKING` \| `POSITION` \| `MANUAL` |
| `sourceType` | enum | ✔ | Nguồn dữ liệu | `MENTORING_RECAP` \| `MENTORING_AWARD` \| `MEMBER_POSITION` \| `SUBMISSION` \| `FUND_MONTHLY` \| `POINT_ADJUSTMENT` |
| `targetMemberType` | enum |  | Đối tượng | `MENTEE` \| `MENTOR` \| `ALL` |
| `conditions` | object (JSON) |  | Điều kiện |  |
| `points` | number | ✔ | Số điểm |  |
| `exclusiveGroup` | string |  | Nhóm loại trừ | ≤ 50 ký tự |
| `priority` | integer |  | Ưu tiên |  |
| `maxPointsPerPeriod` | number |  | Tối đa / kỳ |  |
| `effectiveFrom` | date YYYY-MM-DD |  | Hiệu lực từ |  |
| `effectiveTo` | date YYYY-MM-DD |  | Hiệu lực đến |  |
| `isActive` | boolean |  | Đang hoạt động |  |

#### `point-adjustment`

<a id="point-adjustment"></a>Cộng/trừ điểm thủ công và khiếu nại. Route: `/point-adjustment` · Quyền: Admin + `POINT`

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `periodId` | id | ✔ | Kỳ tháng | `_id` của bản ghi liên kết |
| `memberId` | id | ✔ | Thành viên | `_id` của bản ghi liên kết |
| `pointTypeId` | id | ✔ | Loại điểm | `_id` của bản ghi liên kết |
| `kind` | enum | ✔ | Loại điều chỉnh | `MANUAL` \| `APPEAL` |
| `points` | number | ✔ | Số điểm |  |
| `reason` | string | ✔ | Lý do |  |
| `relatedEntryId` | id |  | Dòng điểm liên quan | `_id` của bản ghi liên kết |
| `status` | enum |  | Trạng thái | `PENDING` \| `APPROVED` \| `REJECTED` |
| `requestedBy` | id |  | Người đề nghị | `_id` của bản ghi liên kết |
| `reviewedBy` | id |  | Người duyệt | `_id` của bản ghi liên kết |
| `reviewedAt` | datetime ISO 8601 |  | Thời điểm duyệt |  |
| `reviewNote` | string |  | Ghi chú duyệt |  |

#### `point-entry`

<a id="point-entry"></a>Sổ cái điểm phụ cấp (hệ thống sinh). Route: `/point-entry` · Quyền: Admin + `POINT` · **chỉ đọc**

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `periodId` | id | ✔ | Kỳ tháng | `_id` của bản ghi liên kết |
| `memberId` | id | ✔ | Thành viên | `_id` của bản ghi liên kết |
| `pointTypeId` | id | ✔ | Loại điểm | `_id` của bản ghi liên kết |
| `ruleId` | id |  | Rule | `_id` của bản ghi liên kết |
| `points` | number | ✔ | Số điểm |  |
| `sourceType` | enum | ✔ | Nguồn dữ liệu | `MENTORING_RECAP` \| `MENTORING_AWARD` \| `MEMBER_POSITION` \| `SUBMISSION` \| `FUND_MONTHLY` \| `POINT_ADJUSTMENT` |
| `sourceId` | id | ✔ | Bản ghi gốc | `_id` của bản ghi liên kết |
| `description` | string |  | Diễn giải |  |
| `status` | enum |  | Trạng thái | `ACTIVE` \| `VOID` |
| `voidReason` | string |  | Lý do hủy |  |
| `voidedBy` | id |  | Người hủy | `_id` của bản ghi liên kết |
| `voidedAt` | datetime ISO 8601 |  | Thời điểm hủy |  |
| `createdBy` | id |  | Người tạo | `_id` của bản ghi liên kết |

#### `allowance-summary`

<a id="allowance-summary"></a>Bảng tổng hợp điểm và tiền phụ cấp theo kỳ (hệ thống sinh). Route: `/allowance-summary` · Quyền: Admin + `POINT` · **chỉ đọc**

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `periodId` | id | ✔ | Kỳ tháng | `_id` của bản ghi liên kết |
| `memberId` | id | ✔ | Thành viên | `_id` của bản ghi liên kết |
| `pointsByType` | object (JSON) |  | Điểm theo loại |  |
| `totalPoints` | number |  | Tổng điểm |  |
| `pointRate` | number |  | Đơn giá điểm |  |
| `baseAllowance` | number |  | Phụ cấp cơ bản |  |
| `amount` | number |  | Thành tiền |  |
| `status` | enum |  | Trạng thái | `DRAFT` \| `LOCKED` \| `PAID` |
| `fullNameSnapshot` | string |  | Họ tên (lúc chốt) | ≤ 255 ký tự |
| `bankAccountSnapshot` | string |  | Số tài khoản (lúc chốt) | ≤ 50 ký tự |
| `bankNameSnapshot` | string |  | Ngân hàng (lúc chốt) | ≤ 255 ký tự |
| `calculatedAt` | datetime ISO 8601 | ✔ | Thời điểm tính |  |
| `lockedAt` | datetime ISO 8601 |  | Thời điểm chốt |  |
| `paidAt` | datetime ISO 8601 |  | Thời điểm chi trả |  |

#### `period-export`

<a id="period-export"></a>Lịch sử file Excel/CSV đã xuất. Route: `/period-export` · Quyền: Admin + `POINT` · **chỉ đọc**

| Trường | Kiểu | Bắt buộc | Mô tả | Ràng buộc / giá trị |
|---|---|---|---|---|
| `periodId` | id | ✔ | Kỳ tháng | `_id` của bản ghi liên kết |
| `exportType` | enum | ✔ | Loại file | `ALLOWANCE_XLSX` \| `ALLOWANCE_CSV` \| `MONTHLY_REPORT_XLSX` |
| `fileUrl` | string | ✔ | File |  |
| `checksum` | string |  | Checksum | ≤ 64 ký tự |
| `exportedBy` | id |  | Người xuất | `_id` của bản ghi liên kết |
| `exportedAt` | datetime ISO 8601 |  | Thời điểm xuất |  |
| `note` | string |  | Ghi chú |  |


---

## 14. Lưu ý nghiệp vụ và giới hạn hiện tại

**Các quy tắc đã có trong API:**
- **`learning-module.code` do server tự sinh** (`LM-0001`, `LM-0002`, …). FE không gửi trường này; gửi lên cũng bị bỏ qua, và không sửa được.
- **`admin-permission`:** `scope = LEARNING_MODULE` thì bắt buộc có `moduleId`; scope khác thì không gửi `moduleId`. Cấp trùng quyền sẽ nhận `409`.
- **`fund-contribution.amount`** bắt buộc và > 0. Một người được nộp nhiều lần trong một tháng, kể cả nhiều lần trong một ngày.
- **Điểm chấm bài** (`submission.totalScore`, `submission-score.score`, thang theo `learning-module.maxScore`, mặc định 100) **khác hoàn toàn** điểm phụ cấp (`point-entry.points`). Không cộng lẫn hai loại.
- **Resource chỉ đọc** (`point-entry`, `allowance-summary`, `period-export`, `mentoring-schedule-log`, `submission-unique-value`): dữ liệu do hệ thống sinh ra. Gọi `POST`, `PUT`, `DELETE` vào các resource này sẽ nhận `404`.
- **Quy ước mã:**
  - `member.memberCode` dạng `HLC-MTE-xxxxx` (mentee) hoặc `HLC-MTO-xxxxx` (mentor).
  - `period.code` dạng `YYYY-MM`, ví dụ `2026-10`.
  - `mentoring-quarter.code` dạng `YYYYQn`, ví dụ `2026Q4`.

**Còn giới hạn:**
- **CRUD thô** (mục 5) của các bảng mentoring, điểm, quỹ, học tập **không** kiểm tra quy tắc nghiệp vụ. Hãy dùng API ở mục 10 và 11.
- `population` chưa dùng được (mục 6.3).
- Route tải file `GET /file/:id/:name` hiện công khai: ai có link là xem được file.
- Chưa có nhắc hạn tự động (thông báo/email) cho recap, nộp bài, đóng quỹ.
- Barem xếp giải hiện dùng điểm recap là tiêu chí chính; muốn thêm thành phần khác (ví dụ đúng hạn, độ dài buổi) cần bổ sung trong `point-calculation.service.ts`.

---

## 15. Code mẫu (TypeScript + axios)

```ts
import axios, { AxiosError } from "axios";

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000" });

// --- token ---
const tokenStore = {
    get access() { return localStorage.getItem("accessToken"); },
    get refresh() { return localStorage.getItem("refreshToken"); },
    save(d: { accessToken: string; refreshToken: string }) {
        localStorage.setItem("accessToken", d.accessToken);
        localStorage.setItem("refreshToken", d.refreshToken);
    },
    clear() { localStorage.removeItem("accessToken"); localStorage.removeItem("refreshToken"); },
};

api.interceptors.request.use((config) => {
    if (tokenStore.access) config.headers.Authorization = `Bearer ${tokenStore.access}`;
    return config;
});

// 401 -> refresh 1 lần rồi gửi lại request
let refreshing: Promise<void> | null = null;
api.interceptors.response.use(undefined, async (error: AxiosError) => {
    const original = error.config as any;
    const isAuthCall = original?.url?.startsWith("/auth/");
    if (error.response?.status !== 401 || original?._retry || isAuthCall || !tokenStore.refresh) {
        throw error;
    }
    original._retry = true;
    refreshing ??= api
        .post("/auth/refresh", { refreshToken: tokenStore.refresh })
        .then((res) => tokenStore.save(res.data.data))
        .catch((e) => { tokenStore.clear(); window.location.href = "/login"; throw e; })
        .finally(() => { refreshing = null; });
    await refreshing;
    return api(original);
});

// --- kiểu dữ liệu chung ---
export interface ApiSuccess<T> { success: true; data: T }
export interface ApiErrorBody { success: false; code?: string; status: number; message: string }
export interface Page<T> { page?: number; skip?: number; limit?: number; total: number; result: T[] }
export type Operator = "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "between" | "not_between" | "in" | "not_in"
    | "contain" | "not_contain" | "start" | "end" | "like" | "not_like" | "null" | "not_null" | "or" | "and";
export interface Filter { field?: string; operator: Operator; values?: unknown[]; filters?: Filter[] }
export interface ListQuery {
    page?: number; limit?: number; skip?: number;
    sort?: Record<string, 1 | -1>;
    select?: string[];
    condition?: Record<string, string | number | boolean>;
    filters?: Filter[];
}

// Chuyển ListQuery sang query string đúng định dạng backend (filters[] lặp lại, JSON được stringify)
export function toParams(q: ListQuery = {}) {
    const p = new URLSearchParams();
    if (q.page) p.set("page", String(q.page));
    if (q.limit) p.set("limit", String(q.limit));
    if (q.skip !== undefined) p.set("skip", String(q.skip));
    if (q.sort) p.set("sort", JSON.stringify(q.sort));
    if (q.select?.length) p.set("select", q.select.join(" "));
    if (q.condition) p.set("condition", JSON.stringify(q.condition));
    q.filters?.forEach((f) => p.append("filters[]", JSON.stringify(f)));
    return p;
}

// --- client CRUD dùng chung cho mọi resource ---
export function crud<T extends { _id: string }>(resource: string) {
    return {
        page: (q?: ListQuery) => api.get<ApiSuccess<Page<T>>>(`/${resource}/page`, { params: toParams(q) }).then((r) => r.data.data),
        many: (q?: ListQuery) => api.get<ApiSuccess<T[]>>(`/${resource}/many`, { params: toParams(q) }).then((r) => r.data.data),
        one: (q?: ListQuery) => api.get<ApiSuccess<T>>(`/${resource}/one`, { params: toParams(q) }).then((r) => r.data.data),
        get: (id: string) => api.get<ApiSuccess<T>>(`/${resource}/${id}`).then((r) => r.data.data),
        create: (body: Partial<T>) => api.post<ApiSuccess<T>>(`/${resource}`, body).then((r) => r.data.data),
        update: (id: string, body: Partial<T>) => api.put<ApiSuccess<T>>(`/${resource}/${id}`, body).then((r) => r.data.data),
        updateMany: (ids: string[], update: Partial<T>) =>
            api.put<ApiSuccess<{ affected: number }>>(`/${resource}/many/ids`, { ids, update }).then((r) => r.data.data),
        remove: (id: string) => api.delete<ApiSuccess<T>>(`/${resource}/${id}`).then((r) => r.data.data),
        removeMany: (ids: string[]) =>
            api.delete<ApiSuccess<{ deleted: number }>>(`/${resource}/many/ids`, { data: { ids } }).then((r) => r.data.data),
        exportXlsx: (definitions: { fields: string[]; labels: string[] }[], q?: ListQuery) =>
            api.post(`/${resource}/export/xlsx`, { definitions }, { params: toParams(q), responseType: "blob" }).then((r) => r.data as Blob),
    };
}

// --- ví dụ dùng ---
export interface Member {
    _id: string; memberCode: string; memberType: "MENTEE" | "MENTOR"; fullName: string;
    phone: string | null; status: "ACTIVE" | "INACTIVE"; createdAt: string; updatedAt: string;
}
export const memberApi = crud<Member>("member");

// Mentee đang hoạt động có tên chứa "van", trang 1, 20 dòng, sắp theo mã
const page = await memberApi.page({
    page: 1, limit: 20, sort: { memberCode: 1 },
    condition: { memberType: "MENTEE", status: "ACTIVE" },
    filters: [{ field: "fullName", operator: "contain", values: ["van"] }],
});

// Upload ảnh minh chứng
export async function uploadFile(file: File) {
    const form = new FormData();
    form.append("file", file);
    form.append("scope", "Public");
    const res = await api.post<ApiSuccess<{ file: { _id: string; name: string }; url: string }>>("/file", form);
    return res.data.data; // { file: { _id, ... }, url }
}

// Hiển thị lỗi
export function errorMessage(e: unknown) {
    const body = (e as AxiosError<ApiErrorBody>).response?.data;
    return body?.message ?? "Không kết nối được máy chủ";
}
```

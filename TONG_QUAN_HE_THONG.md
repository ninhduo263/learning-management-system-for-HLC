# HLC Mentoring & LMS: Tổng quan tính năng và luồng hoạt động

> Tài liệu này mô tả hệ thống **cần làm gì** (theo yêu cầu nghiệp vụ đã chốt) và **code hiện tại đã làm tới đâu**.
> Cập nhật theo mã nguồn ngày 16/10/2026.

---

## 1. Hệ thống giải quyết vấn đề gì

HLC có khoảng **100 mentee** và **120 mentor**; số người thực sự hoạt động là khoảng **40 mentee** và **30 mentor**. Mỗi tháng mentee phải làm nhiều việc: đọc sách, viết bài tâm đắc, mentoring, nộp bài cho ban học tập và đóng quỹ. Hiện nay:

- Dữ liệu thành viên đã có nhưng không tự động hóa được việc ghép cặp, theo dõi kết nối và tính điểm.
- Bài viết, recap và minh chứng nằm rải rác, không về một CSDL chung.
- Không có công cụ tính **điểm phụ cấp và điểm thưởng** để chuẩn bị file chi trả **mùng 10 hằng tháng**.
- Không có báo cáo tháng về số lượng, chất lượng, người điểm cao, người cần cải thiện và cặp tốt nhất.

**Mục tiêu:** Mọi hoạt động được lưu thành bản ghi gốc trong LMS. Điểm được **tính từ các bản ghi gốc đó**, không nhập tay lại. Kết quả được xuất ra dashboard, Excel/CSV và PDF.

---

## 2. Vai trò người dùng

| Vai trò | Việc chính |
|---|---|
| **Admin** | Tạo quý, ghép cặp, theo dõi trạng thái, duyệt recap và minh chứng, tính điểm, chốt kỳ, xuất báo cáo |
| **Mentor** | Xem các cặp được giao, xem lịch mentoring, viết recap sau buổi mentoring |
| **Mentee** | Gửi nguyện vọng mentor, gửi lịch đã chốt, viết recap, nộp bài học tập và minh chứng quỹ |
| *(dự kiến)* Ban học tập, Ban HLC Fund | Duyệt bài của ban mình. **Code hiện chỉ có 3 role:** `ADMIN`, `MENTOR`, `MENTEE` |

Mã thành viên: mentee là `HLC-MTE-xxxxx`, mentor là `HLC-MTO-xxxxx`. Mã ghép cặp dùng **5 chữ số cuối**.

---

## 3. Danh sách module

| # | Module | Mục đích | Trạng thái code |
|---|---|---|---|
| A | Nền tảng | Đăng nhập, phân quyền, import thành viên, quản lý quý/kỳ, ngày giả lập để test | ✅ Đã có |
| B | **Mentoring** (lõi) | Quý, ghép cặp, lịch, recap, trạng thái, báo cáo quý | ✅ Đã có, đang dùng chính |
| C | **Điểm phụ cấp và điểm thưởng** (ưu tiên số 1) | Rule điểm, sự kiện điểm, tổng hợp, chốt kỳ, xuất file | 🟡 Có khung, chưa đúng barem |
| D | Module học tập động | Admin tự tạo loại hoạt động mới (form nộp và cấu hình) | 🟡 Có model và API tạo, chưa gắn vào luồng |
| E | Đọc sách | Thư viện sách và nộp link YouTube cảm nhận | 🔴 Chưa có thư viện; nộp chung qua `Submission` |
| F | Bài tâm đắc | Nộp bài viết về CSDL chung và chấm điểm | 🔴 Chưa có màn riêng |
| G | Ban học tập | Thư viện tài liệu và nộp bài theo tuần (text + ảnh, 3–4 bài/tuần) | 🔴 Có trang nộp bài đơn giản (đang ẩn) |
| H | HLC Fund | Mentee gửi ảnh đóng quỹ, admin duyệt mỗi tối | 🟡 Có trang nộp và trang duyệt (đang ẩn) |
| I | Báo cáo / Dashboard | Dashboard tháng, top/cần cải thiện, PDF/Excel mùng 10 | 🟡 Có Excel; chưa có PDF |

> **Giao diện hiện tại chỉ mở phần Mentoring.** Menu Admin có *Dashboard* và *Quản lý Ghép cặp*; menu Mentor và Mentee có *Mentoring & Recap*. Các trang `admin-points`, `admin-modules`, `admin-fund`, `fund`, `mentee-fund`, `mentee-learning` và `*-dashboard` vẫn còn route nhưng đã bị ẩn khỏi menu.

---

## 4. Luồng Mentoring (chi tiết)

### 4.1 Mốc thời gian của một quý

Mentoring chạy **theo quý** (3 tháng). Mỗi tháng trong quý, mỗi cặp có **một buổi mentoring**. Các mốc dưới đây nằm trong **tháng cuối của quý trước**:

```
Tháng cuối quý trước                                   Quý mới (T1 → T2 → T3)
──●────────────●──────────────────●──────────────────▶──────────────────────────
 Ngày 5        Ngày 10            Ngày 25
 Mentee mở     Admin được tạo     Mentor/Mentee nhìn thấy
 nguyện vọng   quý kế tiếp và     cặp của quý sau và bắt đầu
               ghép cặp           gửi lịch
```

- Admin chỉ được tạo **quý hiện tại** hoặc **quý kế tiếp** (từ ngày 10 tháng cuối quý hiện tại).
- Mentee chỉ xem được **quý sau** từ **ngày 25**.

### 4.2 Admin

1. **Tạo quý mentoring mới**
   - Theo yêu cầu: mã quý tự sinh theo cấu trúc `[năm][quý][MTE][MTO]`.
   - Code hiện tại: mã quý là `YYYYQn` (ví dụ `2026Q4`); quý phải phủ trọn 3 tháng.
2. **Ghép cặp mentor và mentee**. Có 3 cách:
   - **Thêm tay:** chọn quý, tháng, mentor và mentee. Hệ thống tự tạo cặp cho tháng được chọn **và các tháng còn lại của quý**. Một mentee chỉ có một mentor trong một quý.
   - **Import Excel/CSV:** file có cột `MÃ MENTORING`, `CHỨC DANH` và `HLC ID`, mỗi dòng Mentor đi kèm một dòng Mentee ngay dưới. File có thể chứa trạng thái recap cũ theo cột tháng.
   - **Kế thừa:** sao chép cặp của tháng đầu sang tháng khác trong quý.
   - Admin xem được **nguyện vọng** của mentee (danh sách 3–10 mentor mong muốn) để tham khảo khi ghép.
3. **Sửa hoặc xóa cặp.** Khi xóa một cặp, hệ thống xóa cặp từ tháng đó trở đi cùng lịch, recap và điểm liên quan.
4. **Khóa hoặc mở khóa quý.** Khi quý bị khóa, không ai sửa được cặp, lịch hay recap.
5. **Duyệt recap** (Đạt/Từ chối, kèm ghi chú). Recap đã duyệt thì không sửa được nữa.
6. **Sửa hoặc chốt hộ lịch** (override) khi cần.

**Mã cặp theo tháng**
- Theo yêu cầu: `[tháng diễn ra][mã mentor][mã mentee]`.
- Code hiện tại:
  - `monthlyId = T{tháng}Q{quý}{năm}O{5 số cuối mentor}E{5 số cuối mentee}`, ví dụ `T10Q42026O00012E00034`.
  - `quarterlyId = Q{quý}{năm}O…E…`, dùng để gom 3 tháng của cùng một cặp.

### 4.3 Mentee

1. **Gửi nguyện vọng** chọn 3–10 mentor cho quý sau (từ ngày 5 tháng cuối quý).
2. **Xem cặp theo quý:** quý trước, quý này và quý sau (quý sau từ ngày 25). Mentee thấy mentor của mình, profile và số điện thoại.
3. **Gửi lịch đã chốt.** Hai bên tự hẹn qua điện thoại hoặc tin nhắn; trên web mentee chỉ gửi thời gian đã thống nhất lên.
   - Lịch phải nằm **trong đúng tháng** của cặp và phải ở **tương lai**.
   - Mỗi cặp mỗi tháng chỉ có **1 lịch**.
   - **Quy tắc sửa lịch:** chỉ được sửa **trước thời điểm mentoring đã chốt lần đầu**. Qua thời điểm đó thì mất quyền sửa.
4. **Viết recap** sau buổi mentoring. Khung recap chỉ hiện khi bấm nút "Viết bài recap". Recap gồm nội dung và **ít nhất 1 ảnh minh chứng**.

### 4.4 Mentor

1. Xem các cặp và lịch mentoring được giao trong các quý.
2. Theo yêu cầu, mentor cũng được gửi hoặc chốt lịch như mentee. **Code hiện tại chỉ cho mentee đề xuất và chốt lịch**; mentor chỉ xem lịch.
3. Viết recap riêng cho từng buổi. Quy tắc giống mentee.

### 4.5 Vòng đời lịch (trong code)

```
PROPOSED (mentee gửi) ──chốt──▶ CONFIRMED ──▶ COMPLETED
      │ (mentee sửa được khi còn PROPOSED và chưa tới giờ)
      └──────────────▶ CANCELLED
```

Recap chỉ gửi được khi lịch ở trạng thái `CONFIRMED` hoặc `COMPLETED` **và** buổi mentoring đã kết thúc.

### 4.6 Trạng thái recap của **từng người**

Mốc tính là **24 giờ sau buổi mentoring**. Code tính từ `endTime`, tức giờ kết thúc buổi.

| Thời điểm | Chưa nộp | Đã nộp |
|---|---|---|
| Trong 24h | **Chờ** | **Đã nộp** |
| Ngoài 24h | **Chưa xong** | **Nộp muộn** |

### 4.7 Trạng thái của **cặp** (Admin dashboard)

Trạng thái cặp được ghép từ trạng thái của mentor và mentee:

| Thời điểm | Điều kiện | Trạng thái cặp |
|---|---|---|
| Trong 24h | Có ít nhất 1 người chưa nộp | **Chờ** |
| Trong 24h | Cả 2 đã nộp | **Đã xong** |
| Ngoài 24h | Có 1 người chưa nộp | **Chưa xong** |
| Ngoài 24h | Có 1 người nộp muộn | **Nộp muộn** |
| — | Chưa có lịch | **Chưa có lịch** |

Trong code, thứ tự ưu tiên là: *Nộp muộn* > *Chưa xong* > *Đã xong* > *Chờ*.

### 4.8 Dashboard Admin – Mentoring

- Danh sách cặp **theo từng tháng trong quý** (tab `Qn-Tm`), gồm mã cặp, mentor, mentee, profile, lịch và trạng thái recap.
- Bảng **duyệt recap**: số recap chờ duyệt, xem ảnh, Đạt/Từ chối.
- **Báo cáo quý:** mỗi cặp có 2 dòng (Mentor/Mentee), mỗi tháng có mã và trạng thái. Báo cáo **xuất Excel được sau khi quý kết thúc**.
- Danh sách thành viên mentor/mentee (SĐT, email, profile).
- Mentor và mentee có màn **báo cáo quý cá nhân** để xem lại recap của mình.

---

## 5. Điểm phụ cấp và điểm thưởng (ưu tiên số 1)

### 5.1 Nguyên tắc

- **Một nguồn sự thật:** mỗi điểm là một `ScoreEvent` có `sourceType` và `sourceId`, trỏ về bản ghi gốc (lịch, recap, cặp, chức vụ…). Nhờ đó điểm không bị lặp và truy vết được.
- **Rule cấu hình được:** mỗi loại điểm là một `RewardRule` (mã, nhóm, số điểm, kiểu tính, điều kiện). Thêm loại thưởng mới thì thêm rule, không phải sửa code.
- **Kiểu rule:** `ACTION` (tự động từ dữ liệu LMS), `RESULT` (xếp hạng), `ROLE` (chức vụ), `TIME` (mốc thời gian), `MANUAL` (cộng/trừ tay có lý do).
- Điểm mentoring **phải lấy trực tiếp từ dữ liệu mentoring**, không nhập lại.

### 5.2 Barem điểm mentoring (đã chốt)

| Loại | Điều kiện | Điểm |
|---|---|---|
| Mentoring sớm | Recap của **mentee** chuyển sang *Đã nộp* hoặc *Nộp muộn* trong **ngày 1–7** của tháng | **+2** |
| Mentoring sớm | Như trên, trong khoảng **ngày 8 đến 23:59 ngày 13** | **+1** |
| Giải nhất | Cặp đứng thứ 1 | **+5** |
| Giải nhì | Cặp đứng thứ 2 | **+3** |
| Giải ba | Cặp đứng thứ 3 | **+2** |

**Cách xếp giải:**
1. Chỉ xét các cặp có trạng thái **Đã xong** (cả hai nộp đúng hạn).
2. Sắp xếp theo thời điểm mentoring: **buổi diễn ra càng gần đầu tháng thì xếp càng cao**.
3. Lấy 3 cặp đầu danh sách. **Không có đồng giải**: nếu bằng nhau thì vẫn lấy theo thứ tự 1-2-3.

### 5.3 Các loại điểm khác (cần cấu hình thêm)

- Phụ cấp chức vụ: trưởng ban, phó ban, leader, phó leader. Cần lưu chức vụ **kèm thời gian hiệu lực**.
- Đọc sách đủ, bài tâm đắc, bài ban học tập, đóng quỹ đủ.
- Cộng/trừ thủ công có lý do, người duyệt và log.

### 5.4 Luồng tính điểm cuối tháng

```
Dữ liệu LMS (lịch, recap, bài nộp, quỹ, chức vụ)
        │  (tự động theo rule)
        ▼
ScoreEvent (mỗi điểm 1 dòng, trỏ về bản ghi gốc)
        │  Admin bấm "Tính lại"  →  POST /cycles/:id/calculate
        ▼
AllowanceSummary (mỗi mentee 1 dòng: điểm theo nhóm, tổng điểm, tiền)
        │  Admin xem trước, xử lý khiếu nại, rồi "Chốt kỳ"  →  PATCH /cycles/:id/lock
        ▼
Xuất Excel / (PDF) mùng 10  →  gửi chi trả phụ cấp
```

**Công thức tiền trong code:** `Tổng tiền = Phụ cấp cơ bản + Tổng điểm × Đơn giá điểm`. Nếu tổng điểm âm thì phần tương ứng bị khấu trừ. Đơn giá điểm và phụ cấp cơ bản được cấu hình theo kỳ.

**Trạng thái kỳ:** `OPEN → CALCULATING → REVIEWING → LOCKED → EXPORTED → PAID`. Khi kỳ đã khóa thì không thêm hoặc sửa điểm được nữa. Kỳ chưa xuất hoặc chưa trả thì có thể mở khóa lại.

### 5.5 Hiện trạng code so với barem

| Hạng mục | Code hiện tại | Chênh lệch so với barem |
|---|---|---|
| Mentoring sớm (+2/+1) | Đã có hàm `timingPoints` (ngày ≤7 → 2, ≤13 → 1) nhưng **chưa được gọi** ở đâu | Cần gắn vào thời điểm recap của mentee chuyển sang Đã nộp/Nộp muộn |
| Mentoring hoàn tất | Rule mặc định `MENTORING_COMPLETED` +3 khi lịch → `COMPLETED` | Không có trong barem, cần xem lại |
| Top 3 cặp | API `POST /cycles/:id/top-three-awards`: chọn cặp có đủ 2 recap không muộn, xếp theo giờ bắt đầu sớm nhất, cộng 5/3/2 **cho cả mentor và mentee** | Hiện tính cho cả quý, chưa tách theo tháng |
| Chức vụ | Rule `ROLE_POSITION` +4 cho mọi chức vụ, lấy từ `User.position` | Chưa phân mức theo từng chức vụ; chưa có thời gian hiệu lực |
| Bài nộp được duyệt | Rule `SUBMISSION_APPROVED` +2 | Cần chốt barem |
| Rule tạo mới | Admin tạo được rule, nhưng chỉ các rule có code xử lý riêng mới tự chạy | Chưa có rule engine tổng quát |
| Xuất file | Excel bảng phụ cấp và Excel báo cáo tháng | **Chưa có PDF** |

---

## 6. Các module còn lại (theo yêu cầu)
- notes: 
  + có 2 loại điểm: điểm phụ cấp (1,2,3,...) và điểm chấm bài của 1 module học tập (thang 100) do admin chấm
  + admin chia nhỏ các quyền hạn: admin tổng, admin của mỗi 1 module học tập, admin của nhiều module học tập

### 6.1 Module học tập động (Learning Module Builder)
Admin tạo một "loại hoạt động" mới chỉ bằng cấu hình, không cần code. Cấu hình gồm:
- Tên, đối tượng nộp, chu kỳ (ngày/tuần/tháng) và số bài tối thiểu mỗi kỳ (mã tự sinh).
- Loại dữ liệu nộp: text, ảnh, link YouTube, file.
- Có cần duyệt không và ai duyệt. Trạng thái duyệt: Chờ / Đạt / Chưa đạt.
- Có chấm điểm không, thang điểm, và gắn với rule điểm nào.

Mọi bài nộp lưu về **một bảng chung** (`Submission`) và lọc được theo người, kỳ, module và trạng thái.
*Code:* đã có `Module`, `Assignment` và `Submission` (text, ảnh, video, file); admin tạo được module. Phần chu kỳ, số bài tối thiểu và người duyệt chưa có.

### 6.2 Đọc sách
Gồm thư viện sách (tên, thể loại, ảnh bìa). Mentee chọn sách rồi gửi **link YouTube cảm nhận**; hệ thống kiểm tra định dạng link và chặn trùng. Admin xem, duyệt và chấm.

### 6.3 Bài tâm đắc
Mentee nộp bài viết vào CSDL chung, mục tiêu **1 bài/tháng**. Bài được chấm theo tiêu chí.

### 6.4 Ban học tập
Gồm thư viện tài liệu và **nộp bài theo tuần** (3–4 bài/tuần, có text và ảnh). Hệ thống theo dõi đủ hoặc thiếu bài.

### 6.5 HLC Fund
- Mentee gửi **ảnh minh chứng** đóng quỹ hằng ngày. Ảnh được upload qua Cloudinary.
- **Duyệt buổi tối:** admin xem danh sách trong ngày và duyệt từng mục. Trạng thái: **Chờ / Đã xong / Chưa xong**.
- Thống kê ai đã nộp, ai chưa nộp, và số ngày nộp đủ trong tháng.

*Code:* đã có trang nộp, trang duyệt (Duyệt/Từ chối) và API thống kê theo trạng thái. Chưa có lọc theo ngày, duyệt hàng loạt hay thống kê theo người.

---

## 7. Báo cáo và Dashboard (mục tiêu)

- Dashboard tháng: số bài nộp, tỷ lệ hoàn thành từng module, chất lượng trung bình.
- Top mentee điểm cao và danh sách mentee cần cải thiện (thiếu bài, điểm thấp).
- Xếp hạng cặp mentoring tốt nhất và các cặp chưa hoạt động.
- Biểu đồ so sánh giữa các tháng.
- **Mùng 10 hằng tháng:** xuất bảng điểm và tiền phụ cấp của từng mentee ra **Excel/CSV và PDF** (có ngày chốt).

*Code:* API `/dashboard/overview` đã trả về số liệu tổng, top 5, 5 người điểm thấp, top cặp và thống kê quỹ, nhưng giao diện admin dashboard hiện chỉ hiển thị báo cáo mentoring quý và danh sách thành viên.

---

## 8. Kiến trúc kỹ thuật (tóm tắt)

| Thành phần | Công nghệ |
|---|---|
| Backend | Node.js, Express 5, MongoDB/Mongoose, JWT, bcrypt, xlsx, multer (`hlc-mentoring-backend/`) |
| Frontend | Next.js App Router, TypeScript, Ant Design, TailwindCSS (`hlc-mentoring-web/`) |
| Lưu ảnh | Cloudinary (DB chỉ lưu URL) |
| Kiểm thử thời gian | Admin đặt **ngày giả lập** cho toàn hệ thống (`/api/time/mock` hoặc biến `MOCK_DATE`) để test các mốc ngày 5/10/25 và hạn 24h |

### Các bảng dữ liệu chính

| Nhóm | Collection | Nội dung |
|---|---|---|
| Người dùng | `User` | Mã, họ tên, role, team, chức vụ, SĐT, email, ngân hàng, ngày sinh (dùng làm mật khẩu mặc định), trạng thái hoạt động |
| Kỳ | `Cycle` | Mã quý, ngày bắt đầu/kết thúc, trạng thái, khóa, đơn giá điểm, phụ cấp cơ bản |
| Mentoring | `MentorPreference` | Nguyện vọng 3–10 mentor của mentee cho một quý |
| | `MentoringPair` | Cặp theo tháng (`monthlyId`, `quarterlyId`), mentor, mentee, khóa, trạng thái recap import từ file cũ |
| | `MentoringSchedule` | Lịch theo tháng: giờ bắt đầu/kết thúc, địa điểm/link, trạng thái, thời điểm chốt |
| | `MentoringRecap` | Recap theo người và vai trò: nội dung, ảnh, thời điểm nộp, trạng thái, người duyệt |
| Học tập | `Module`, `Assignment`, `Submission` | Cấu hình hoạt động, bài tập theo kỳ và bài nộp chung (cả HLC Fund) |
| Điểm | `RewardRule` | Định nghĩa loại điểm |
| | `ScoreEvent` | Từng lần cộng/trừ điểm, có nguồn gốc (không trùng theo user + kỳ + rule + nguồn) |
| | `AllowanceSummary` | Bảng tổng hợp điểm và tiền theo mentee và kỳ |

---

## 9. Thứ tự ưu tiên tiếp theo (rút gọn)

1. **Hoàn thiện điểm mentoring đúng barem:** gắn +2/+1 theo ngày recap của mentee, xếp giải 5/3/2 theo tháng, bỏ hoặc điều chỉnh rule +3 "hoàn tất".
2. **Bảng tổng hợp điểm cho admin:** mỗi hàng một mentee, mỗi cột một loại điểm, bấm vào ô để xem bản ghi gốc. Có nút Tính lại → Chốt kỳ.
3. **Xuất file mùng 10:** Excel/CSV (đã có khung) và PDF.
4. Phụ cấp chức vụ theo từng mức và thời gian hiệu lực; cộng/trừ thủ công có log.
5. Mở lại và hoàn thiện HLC Fund (duyệt buổi tối theo ngày).
6. Module Builder đầy đủ, sau đó dựng Đọc sách, Bài tâm đắc và Ban học tập từ đó.
7. Dashboard tháng, thông báo nhắc hạn, phân quyền Ban học tập và Ban HLC Fund.

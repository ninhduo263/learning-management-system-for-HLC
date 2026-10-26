# Yêu cầu cải thiện Web quản trị Mentoring, vòng 10 (ngôn ngữ nghiệp vụ)

> **Phạm vi:** Các cập nhật giao diện (hiển thị số điện thoại kèm Zalo, logo HLC, tone màu sáng hơn), hai lỗi logic về **hạn recap** và **hạn thưởng mentoring sớm**, và chức năng **ghi đè mật khẩu** cho Admin toàn cục.
>
> **Thuật ngữ:** **MTE** = Mentee. **MTO** = Mentor. **Admin toàn cục** = quản trị cao nhất.

---

## 1. Giao diện

### 1.1. Hiển thị số điện thoại kèm link Zalo trên các bảng tiến độ

**Hiện trạng:** Ở phần duyệt HLC Fund, **bảng tiến độ theo nhóm MTE** và **bảng tiến độ theo nhóm MTO và thầy cô** chưa hiện **số điện thoại có link Zalo**.

**Yêu cầu nghiệp vụ:**
- Hai bảng tiến độ trên phải hiển thị **số điện thoại** của từng người; **bấm vào số điện thoại** thì **chuyển sang link Zalo** theo quy tắc đã chốt ở v9: `https://zalo.me/` ghép với số điện thoại, **giữ số 0 đầu**.
- **Thầy cô ngoài danh sách MTO:** khi thêm thầy cô vào bảng HLC Fund của nhóm MTO và thầy cô, **số điện thoại của thầy cô cũng tự động có link Zalo** theo cùng quy tắc, không cần nhập link riêng.
- **Tất cả bảng tiến độ khác** (tiến độ nhóm, tiến độ module học tập, tiến độ mentoring, danh sách ghép cặp...) cũng phải hiển thị **số điện thoại kèm link Zalo** khi bấm vào số.
- Áp dụng đúng **quy tắc ẩn số** đã chốt ở v9: thành viên đã bật ẩn thì chỉ **chính chủ, người trong cặp, người cùng nhóm, Admin toàn cục và các Trưởng ban** thấy số; người khác thấy dấu ẩn.
- Người chưa có số điện thoại thì để trống, không hiển thị link.
- **Số điện thoại của thầy cô ngoài danh sách** chỉ **Trưởng ban HLC Fund, Admin toàn cục và trưởng nhóm HLC Fund** xem được.
- Khi thêm thầy cô ngoài danh sách vào bảng HLC Fund, **số điện thoại là trường bắt buộc**, và ô nhập ghi rõ **"Số điện thoại có đăng ký Zalo"** để link Zalo mở đúng.

**Tiêu chí hoàn thành:** Mở bảng tiến độ HLC Fund của nhóm MTE và nhóm MTO, thầy cô; mỗi dòng có số điện thoại bấm được. Thêm một thầy cô ngoài danh sách có số điện thoại thì dòng mới cũng bấm được sang Zalo.

### 1.2. Logo HLC cho biểu tượng tab (favicon)

- Thêm **logo HLC** làm **biểu tượng hiển thị ở tab trình duyệt** khi mở web.
- Dùng file **`Logo_HLC.png`**: ảnh PNG hình vuông (3538×3538 px), **nền trong suốt**.
- Hiển thị rõ ở kích thước nhỏ, trên cả nền sáng và nền tối của trình duyệt.

### 1.3. Logo HLC trên menu

- Thay **logo tự sinh cũ** ở menu bằng **logo HLC chính thức**, dùng file **`Logo_HLC_text.png`**: ảnh PNG hình ngang.
- Logo hiển thị **rõ nét, không méo, không bị cắt**, cả khi menu **thu gọn** và trên **điện thoại** (khi menu thu gọn có thể dùng logo vuông ở mục 1.2).
- Nền logo phù hợp với màu nền menu (nên dùng ảnh **nền trong suốt**).

**Kết quả kiểm tra hai file đã gửi:**
- **`Logo_HLC.png` (favicon):** ảnh vuông 3538×3538 px, **có nền trong suốt**, dùng được.
- **`Logo_HLC_text.png` (logo menu):** ảnh ngang 8000×2579 px, **không có nền trong suốt** (nền trắng đặc), và **khoảng hai phần ba bên phải biểu tượng tròn chỉ toàn màu trắng, không thấy chữ nào**. Nhiều khả năng chữ trong logo là **chữ trắng** và đã bị mất khi file được xuất trên nền trắng. Nếu dùng nguyên file này, menu sẽ chỉ hiện biểu tượng tròn kèm một khoảng trắng lớn.
- **Cần làm:** **xuất lại logo ngang với nền trong suốt** (PNG có kênh trong suốt). Nếu menu theo **tone sáng** (mục 1.4) thì cần thêm **phiên bản chữ màu navy `#0E1B4D`**; nếu chỉ có bản chữ trắng thì menu phải có **nền đậm** (navy hoặc xanh dương đậm `#1172BA`) để chữ hiển thị.
- Kích thước 8000 px quá lớn cho web; nên **giảm kích thước** (chiều cao vài trăm px) để trang tải nhanh.

### 1.4. Tone màu sáng hơn, kết hợp đẹp với bảng màu thương hiệu

**Bảng màu đã chốt (giữ nguyên từ v9):**

| Nhóm | Mã màu |
|---|---|
| **Màu chính** (các trang chính) | `#9BCB65`, `#F9EC3B`, `#50C4F1`, `#1172BA` |
| **Màu phụ** (chi tiết phụ) | `#0E1B4D`, `#FFFFFF` |

**Yêu cầu nghiệp vụ:**
- Chuyển giao diện sang **tone sáng hơn, tươi hơn**: **nền trắng và các sắc nhạt** từ màu thương hiệu làm chủ đạo; màu chính dùng làm **điểm nhấn** (nút, tiêu đề, trạng thái, biểu đồ), tránh nền quá tối hoặc quá nặng.
- Các màu **kết hợp hài hòa** với nhau, không tách rời từng khối.
- **Vẫn giữ quy tắc độ dễ đọc** đã chốt ở v9 (mục 2.2): chữ **navy `#0E1B4D`** trên nền xanh lá, vàng, xanh dương nhạt; **chữ trắng chỉ trên nền xanh dương đậm `#1172BA` hoặc navy**; chữ nội dung là navy trên nền trắng. Tone sáng hơn **không được làm giảm độ tương phản**, đặc biệt với người dùng lớn tuổi.
- Được **thêm màu hợp tone** (nền nhạt, xám xanh trung tính) khi cần.
- Áp dụng **nhất quán** cho toàn bộ giao diện.

---

## 2. Lỗi logic: hạn recap và hạn thưởng mentoring sớm

### 2.1. Hạn viết recap mentoring

**Yêu cầu nghiệp vụ:**
- **Hạn nộp recap = thời điểm buổi mentoring kết thúc + 24 giờ.**
- Ví dụ: buổi mentoring kết thúc lúc 20:00 ngày 10 thì hạn nộp recap là **20:00 ngày 11**.
- Hạn tính theo **giờ Việt Nam**, và tính theo **từng buổi** chứ không theo cả tháng.
- Khi **lịch bị ghi đè**, hạn recap **tự tính lại** theo thời điểm kết thúc mới (đúng quy tắc đã chốt ở vòng 1).
- Recap **nộp quá hạn** chỉ hiển thị trạng thái **"nộp muộn"** như logic cũ, **không trừ điểm**.

### 2.2. Hạn nhận điểm phụ cấp thưởng mentoring sớm

**Yêu cầu nghiệp vụ:**

| Mốc | Điều kiện về thời gian | Điểm phụ cấp thưởng |
|---|---|---|
| **Tuần 1** | Trước **23:59 ngày 7** hàng tháng | **+2 điểm** |
| **Tuần 2** | Trước **23:59 ngày 14** hàng tháng | **+1 điểm** |

- Thời điểm tính theo **giờ Việt Nam**.
- Hai mốc **áp dụng cho từng tháng** của kỳ mentoring, không phải tính cho cả quý.
- Quá 23:59 ngày 14 thì **không có điểm thưởng sớm**.
- Điều kiện đã chốt ở vòng 2 **vẫn giữ**: điểm phụ cấp mentoring của MTE **chỉ được tính sau khi recap được duyệt**.
- Khi lịch bị ghi đè, mốc thưởng sớm **tự tính lại** theo lịch mới.

**Mốc so sánh hạn thưởng sớm (đã chốt): thời điểm nộp recap lần đầu.**
- Hệ thống lưu **mốc nộp recap lần đầu** của từng buổi và dùng mốc này để so với hạn ngày 7 và ngày 14. Sửa recap về sau **không làm đổi** mốc này.
- **Ghi nhật ký đầy đủ** mọi lần nộp và lần sửa recap (thời điểm, nội dung trước và sau), để người duyệt xem lại.
- **Mốc thưởng luôn tính theo lần nộp đầu tiên**, kể cả khi lần đó sơ sài; hệ thống **không tự tính lại** mốc.
- Mục đích: tránh trường hợp **cố ý nộp bài sơ sài hoặc lung tung** chỉ để giữ mốc nhận thưởng rồi sửa lại sau. Người duyệt xem nhật ký để phát hiện.
- **Khi người duyệt thấy dấu hiệu gian lận mốc** (nộp lần đầu sơ sài, sửa nhiều sau đó), họ **cân nhắc và gửi đề xuất** cho **admin điểm phụ cấp (Trưởng ban HLC Fund)** để **trừ thủ công điểm thưởng sớm** của buổi đó, theo cơ chế đề xuất đã chốt ở v6. Trưởng ban HLC Fund xem nhật ký rồi duyệt hoặc từ chối; việc trừ có **lý do** và ghi vào **nhật ký điểm**.
- Điều kiện vẫn giữ: điểm thưởng chỉ tính **sau khi recap được duyệt**.

---

## 3. Chức năng mới: ghi đè mật khẩu cho thành viên

**Bối cảnh:** Một số thành viên có thể **quên mật khẩu mới đặt** (sau khi tự đổi mật khẩu), nên cần cách hỗ trợ nhanh.

**Yêu cầu nghiệp vụ:**
- Chỉ **Admin toàn cục** được **ghi đè (đặt lại) mật khẩu** cho bất kỳ thành viên nào.
- **Không xem được** mật khẩu cũ của thành viên; chỉ có thể **đặt mật khẩu mới**.
- **Hệ thống tự sinh mật khẩu mới** (Admin không tự nhập), hiển thị cho Admin **một lần** để chuyển cho thành viên, **không lưu dạng đọc được**.
- Sau khi ghi đè, **các phiên đăng nhập cũ** của thành viên đó **bị đăng xuất**.
- **Ghi nhật ký** mọi lần ghi đè (ai làm, cho ai, lúc nào), **không ghi mật khẩu** vào nhật ký.
- **Bắt buộc thành viên đổi lại mật khẩu ở lần đăng nhập kế tiếp** sau khi bị ghi đè, **áp dụng ngay trong giai đoạn thử nghiệm**.
- Có **xác nhận rõ ràng** trước khi ghi đè để tránh bấm nhầm.

---

## 4. Bảng tổng hợp ưu tiên đề xuất

| Mức | Hạng mục | Lý do |
|---|---|---|
| **Cao** | Hạn recap = kết thúc + 24 giờ; mốc thưởng sớm ngày 7 và 14 | Ảnh hưởng điểm phụ cấp |
| **Cao** | Hiển thị số điện thoại kèm Zalo trên các bảng tiến độ | Liên hệ nhanh khi duyệt, nhắc việc |
| **Trung bình** | Ghi đè mật khẩu cho Admin toàn cục | Hỗ trợ thành viên quên mật khẩu |
| **Trung bình** | Tone màu sáng hơn theo bảng màu thương hiệu | Nhận diện thương hiệu |
| **Thấp hơn** | Logo favicon và logo menu | Cần có file ảnh trước |

---

## 5. Các quyết định đã chốt trong vòng này

| # | Nội dung | Quyết định |
|---|---|---|
| 1 | Hạn viết recap | **Mốc mentoring xong + 24 giờ** |
| 2 | Thưởng mentoring sớm tuần 1 | **Trước 23:59 ngày 7 hàng tháng: +2 điểm** |
| 3 | Thưởng mentoring sớm tuần 2 | **Trước 23:59 ngày 14 hàng tháng: +1 điểm** |
| 4 | Ghi đè mật khẩu | **Có**, do Admin toàn cục thực hiện |
| 5 | Logo | **Favicon: `Logo_HLC.png` (vuông). Menu: `Logo_HLC_text.png` (ngang)**, cần xuất lại bản nền trong suốt (mục 1.3) |
| 6 | Mốc so sánh hạn thưởng sớm | **Thời điểm nộp recap lần đầu**, có nhật ký lần nộp và lần sửa |
| 7 | Recap nộp muộn | **Chỉ hiện trạng thái nộp muộn**, không trừ điểm |
| 8 | Người xem số điện thoại thầy cô ngoài danh sách | **Trưởng ban HLC Fund, Admin toàn cục, trưởng nhóm HLC Fund** |
| 9 | Ghi đè mật khẩu | **Hệ thống tự sinh mật khẩu mới**, thành viên **phải đổi lại** ở lần đăng nhập sau |
| 10 | Mốc thưởng khi lần nộp đầu sơ sài | **Vẫn tính theo lần nộp đầu tiên**; người duyệt xem nhật ký rồi **đề xuất Trưởng ban HLC Fund trừ thủ công** điểm thưởng nếu cần |
| 11 | Số điện thoại thầy cô ngoài danh sách | **Bắt buộc**, ghi rõ là số có đăng ký Zalo |
| 12 | Bắt buộc đổi mật khẩu sau khi bị ghi đè | **Áp dụng ngay trong giai đoạn thử nghiệm** |

---

## 6. Còn cần chốt

1. **File logo ngang:** gửi lại bản **nền trong suốt**, và bản chữ **màu navy** nếu menu dùng nền sáng (mục 1.3). Đây là việc cần bạn chuẩn bị file, không phải câu hỏi nghiệp vụ.

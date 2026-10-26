# Yêu cầu cải thiện Web quản trị Mentoring, vòng 9 (ngôn ngữ nghiệp vụ)

> **Phạm vi:** Một lỗi cần sửa (quyền của tài khoản cũ còn lưu sau khi đăng xuất) và các cập nhật giao diện: **nhận diện thương hiệu**, **bảng nhóm HLC Fund của MTO và thầy cô**, **font chữ**, và **trường Zalo cá nhân**.
>
> **Thuật ngữ:** **MTE** = Mentee. **MTO** = Mentor.

---

## 1. Sửa lỗi: quyền của tài khoản cũ không được xóa khi đăng xuất

**Ghi chú:** Đây là **cùng một lỗi** với lỗi số 4 trong `yeu-cau-cai-thien-web-mentoring-v8.md` (mục 5). Chỉ cần xử lý một lần, không làm trùng.

**Hiện trạng:** Thông tin quyền của người đăng nhập (`useAccess`) được lưu tạm trên trình duyệt và **không bị xóa khi đăng xuất**.

**Yêu cầu nghiệp vụ:**
- Khi **đăng xuất**, toàn bộ thông tin quyền lưu tạm phải được **xóa sạch**.
- Khi **đăng nhập** bằng tài khoản khác (kể cả không tải lại trang), giao diện luôn **tải đúng quyền của tài khoản mới**.
- Giao diện chỉ hiển thị chức năng thuộc quyền của người đang đăng nhập; **máy chủ vẫn là nơi quyết định cuối cùng**.

**Tiêu chí hoàn thành:** Đăng nhập Admin, đăng xuất, đăng nhập ngay bằng tài khoản MTE thường **không tải lại trang** thì chỉ thấy chức năng của MTE.

---

## 2. Nhận diện thương hiệu cho giao diện

### 2.1. Bảng màu thương hiệu

| Nhóm | Mã màu | Màu | Vai trò đề xuất |
|---|---|---|---|
| **Màu chính** (các trang chính) | `#9BCB65` | Xanh lá | Màu nhấn tích cực, trạng thái hoàn thành, điểm nhấn thương hiệu |
| | `#F9EC3B` | Vàng | Điểm nhấn nổi bật, trạng thái chờ, biểu tượng |
| | `#50C4F1` | Xanh dương nhạt | Nền khu vực, biểu đồ, đường dẫn thân thiện |
| | `#1172BA` | Xanh dương đậm | Nút hành động chính, tiêu đề, liên kết |
| **Màu phụ** (chi tiết phụ) | `#0E1B4D` | Xanh navy đậm | **Màu chữ chính**, thanh điều hướng, các chi tiết cần độ tương phản cao |
| | `#FFFFFF` | Trắng | Nền nội dung, chữ trên nền màu đậm |

**Yêu cầu nghiệp vụ:**
- **Màu chính dùng cho các trang chính** (trang tổng quan, dashboard, danh sách); **màu phụ dùng cho chi tiết phụ** (chữ, viền, nền nội dung).
- Được **thêm các màu hợp tone** (nền nhạt từ chính các màu thương hiệu, màu xám xanh trung tính, màu cảnh báo dịu) để xây giao diện, miễn là **hài hòa** với bảng màu trên.
- Áp dụng **nhất quán** cho toàn bộ giao diện (đăng nhập, menu, dashboard, bảng, nút, biểu đồ).

### 2.2. Lưu ý về độ dễ đọc (rất quan trọng với người lớn tuổi)

Đã kiểm tra tỷ lệ tương phản của từng màu. Tỷ lệ từ **4,5 trở lên** là mức đọc rõ cho chữ thường:

| Màu | Chữ **trắng** trên nền màu | Chữ **navy `#0E1B4D`** trên nền màu |
|---|---|---|
| Xanh lá `#9BCB65` | 1,9 (**không đạt**) | 8,7 (đạt) |
| Vàng `#F9EC3B` | 1,2 (**không đạt**) | 13,3 (đạt) |
| Xanh dương nhạt `#50C4F1` | 2,0 (**không đạt**) | 8,2 (đạt) |
| Xanh dương đậm `#1172BA` | 5,1 (đạt) | 3,2 (không đạt) |

**Hệ quả cho thiết kế:**
- Trên nền **xanh lá, vàng, xanh dương nhạt** phải dùng **chữ navy `#0E1B4D`**, **không dùng chữ trắng**.
- Chữ trắng chỉ dùng trên nền **xanh dương đậm `#1172BA`** hoặc **navy**.
- **Không dùng chữ vàng hoặc xanh lá trên nền trắng** (khó đọc); chỉ dùng hai màu này làm nền hoặc dấu nhấn, không làm màu chữ.
- **Chữ nội dung chính dùng màu navy trên nền trắng** (tương phản cao nhất).

---

## 3. Bảng biểu nhóm HLC Fund của MTO và thầy cô

### 3.1. Thiết kế đẹp hơn, phù hợp người lớn tuổi

Nhóm MTO và thầy cô là người dùng lớn tuổi, nên bảng cần **dễ đọc, ít thao tác, ít nhầm lẫn**:

- **Chữ lớn**, giãn hàng rộng, hàng đủ cao để bấm chính xác (kể cả trên điện thoại).
- **Độ tương phản cao** (theo mục 2.2), tránh chữ nhạt trên nền nhạt.
- **Ít cột, mỗi cột một ý rõ ràng**: tên, kỳ, số tiền, trạng thái, ảnh minh chứng. Các thông tin phụ ẩn vào chi tiết.
- Hàng **xen kẽ màu nền nhạt** (từ màu thương hiệu) để mắt dễ theo dõi.
- **Nút to, nhãn bằng chữ rõ** (ví dụ "Xem minh chứng", "Nộp minh chứng"), không chỉ dùng biểu tượng.
- Xem ảnh minh chứng **mở lớn, phóng to được**.
- Tiêu đề cột và nhãn bằng **ngôn ngữ thông thường**, không dùng thuật ngữ kỹ thuật.
- Bộ lọc **đơn giản** (theo tháng, theo trạng thái), mặc định hiện **kỳ hiện tại**.
- Hiển thị tốt trên **điện thoại**.

### 3.2. Trạng thái và màu sắc: ngôn ngữ phù hợp khoản tình nguyện

**Bối cảnh:** Đây là doanh nghiệp xã hội **nhận nguồn tiền do người ngoài tình nguyện đóng góp**. Vì là tình nguyện nên **không dùng cách nói "đã xong / chưa xong"** (gợi cảm giác nghĩa vụ, áp lực). Giao diện cần **minh bạch, đáng tin, ấm áp**.

**Chỉ còn hai trạng thái hiển thị:**

| Trạng thái | Màu | Biểu tượng | Ý nghĩa |
|---|---|---|---|
| **Đã ghi nhận** | Nền xanh lá `#9BCB65`, chữ navy | Dấu tích | Khoản đóng góp đã được xác nhận và ghi vào sổ quỹ |
| **Đang chờ xác nhận** | Nền vàng `#F9EC3B` **hoặc không màu** (viền navy), chữ navy | Đồng hồ | Đã nộp minh chứng, đang chờ xác nhận |

**Đối chiếu với trạng thái cũ:**
- *Đã xong* đổi thành **Đã ghi nhận**.
- *Chờ* đổi thành **Đang chờ xác nhận**.
- *Chưa xong* **bỏ**: khi chưa có khoản đóng góp, ô để **trống hoặc dấu gạch ngang trung tính**, không gắn nhãn và không tô màu cảnh báo.
- **Chế độ xem quản trị** (Trưởng ban HLC Fund, Admin) có thêm bộ lọc **"Chưa có ghi nhận"** để biết ai cần được nhắc nhẹ; nhãn này dùng chữ trung tính, không màu cảnh báo, và **người dùng thường không thấy**.

**Nguyên tắc:**
- **Không dùng màu đỏ hoặc cam** cảnh báo cho khoản chưa có.
- **Không chỉ dựa vào màu**: mỗi trạng thái luôn có **chữ và biểu tượng** đi kèm.
- Màu, chữ và biểu tượng dùng **thống nhất** ở bảng, dashboard và báo cáo.
- Có thể thêm lời **cảm ơn** ở khoản đã ghi nhận.
- Dashboard thu quỹ nên có phần **tổng số tiền đã ghi nhận** nổi bật, tăng cảm giác minh bạch với nhà tài trợ.

---

## 4. Font chữ

**Yêu cầu nghiệp vụ:**
- **Giữ hướng giới trẻ:** font **tròn, nét to, chữ rõ**.
- **Bắt buộc hiển thị đầy đủ tiếng Việt** (đủ dấu, không bị lỗi hoặc thay font khi gặp chữ có dấu).
- Cỡ chữ nội dung **đủ lớn** để đọc thoải mái (đặc biệt ở bảng nhóm HLC Fund của MTO và thầy cô); chữ in đậm cho tiêu đề và số liệu quan trọng.
- Dùng **một họ font thống nhất** cho toàn bộ giao diện.
- Gợi ý font hợp hướng này và hỗ trợ tiếng Việt: **Nunito, Quicksand, Baloo 2** (cần kiểm tra thực tế trước khi chọn).

---

## 5. Thêm trường "Zalo cá nhân" và quyền riêng tư số điện thoại

### 5.1. Liên kết Zalo

**Yêu cầu nghiệp vụ:**
- Liên kết Zalo được **tạo tự động từ số điện thoại liên hệ** đã khai báo trong hồ sơ, **không có ô nhập số Zalo riêng** và **không có công tắc bật/tắt**.
- **Bật cho tất cả thành viên**: ai có số điện thoại trong hồ sơ thì **có liên kết Zalo**; ai chưa có số điện thoại thì **không có liên kết** (chỉ hiện trống).
- **Quy tắc tạo link:** `https://zalo.me/` ghép với số điện thoại, **giữ số 0 đầu**. Ví dụ số `0912345678` thì link là `https://zalo.me/0912345678`.
- **Cách hiển thị:** hiển thị **số điện thoại**. Khi **bấm vào số điện thoại**, hệ thống **chuyển hướng sang link Zalo** (nên mở ở tab mới).
- Trường này **không thuộc nhóm nhạy cảm cần duyệt** (danh sách đã chốt ở v7: số tài khoản, ngân hàng, CCCD), nên đổi số điện thoại là có hiệu lực ngay.
- Hiển thị ở các nơi cần liên hệ: hồ sơ cá nhân, danh sách ghép cặp, danh sách nhóm, **theo quy tắc ẩn số điện thoại ở mục 5.2**.

### 5.2. Ẩn số điện thoại với người ngoài cặp và nhóm

**Quyết định:** Thành viên **được ẩn số điện thoại** của mình với người ngoài cặp và nhóm của mình.

**Yêu cầu nghiệp vụ:**
- Trên hồ sơ có **tùy chọn "Ẩn số điện thoại với người ngoài cặp và nhóm của tôi"**.
- Khi **bật ẩn**, số điện thoại **và liên kết Zalo** (vì liên kết lộ số) chỉ hiển thị cho:
  - **chính chủ**,
  - **người trong cặp** (MTE và MTO đã ghép cặp với nhau),
  - **người cùng nhóm** (thành viên, trưởng nhóm, phó nhóm của nhóm đó),
  - **người cần số để làm việc**: **Admin toàn cục và các Trưởng ban vẫn thấy số** dù thành viên đã bật ẩn (đã chốt).
- Người ngoài các nhóm trên thấy **trường trống hoặc dấu ẩn** thay vì số.
- **Mặc định là hiển thị** (tùy chọn ẩn tắt) cho cả thành viên mới và thành viên cũ; thành viên tự bật ẩn khi muốn.
- Khi **không bật ẩn**, số điện thoại và liên kết Zalo hiển thị cho **tất cả thành viên**.
- Thay đổi tùy chọn ẩn **ghi nhật ký** (ai đổi, lúc nào).

---

## 6. Bảng tổng hợp ưu tiên đề xuất

| Mức | Hạng mục | Lý do |
|---|---|---|
| **Cao** | Xóa quyền lưu tạm khi đăng xuất | Tránh hiển thị sai quyền (trùng lỗi v8) |
| **Cao** | Bảng màu thương hiệu và quy tắc độ tương phản | Nền tảng cho toàn bộ giao diện |
| **Trung bình** | Bảng nhóm HLC Fund của MTO và thầy cô, trạng thái và màu | Người dùng lớn tuổi, cần dễ dùng và minh bạch |
| **Trung bình** | Trường Zalo cá nhân | Thuận tiện liên hệ giữa cặp, nhóm |
| **Thấp hơn** | Chọn font chữ | Làm sau khi chốt bảng màu |

---

## 7. Các quyết định đã chốt

| # | Nội dung | Quyết định |
|---|---|---|
| 1 | Màu và từ chỉ trạng thái bảng HLC Fund của MTO và thầy cô | Khoản **tình nguyện**, **không dùng "xong / chưa xong"**; không dùng màu đỏ hoặc cam |
| 2 | Tên và màu trạng thái | **Đã ghi nhận** (xanh lá), **Đang chờ xác nhận** (vàng hoặc không màu) |
| 3 | Nguồn số Zalo | **Dùng chung số điện thoại liên hệ** |
| 4 | Ai xem số Zalo | **Tất cả thành viên**, trừ người đã chọn ẩn số (xem dòng 8) |
| 5 | Dạng số khi ghép link | **Giữ số 0 đầu** (ví dụ `https://zalo.me/0912345678`) |
| 6 | Bộ lọc "chưa có ghi nhận" cho quản trị | **Có**, chữ trung tính, người dùng thường không thấy |
| 7 | Công tắc bật/tắt Zalo | **Không có**; bật cho tất cả, ai có số điện thoại thì có link |
| 8 | Ẩn số điện thoại | **Có**, thành viên được ẩn số với người ngoài cặp và nhóm của mình |
| 9 | Mặc định của tùy chọn ẩn số | **Mặc định hiển thị**; thành viên tự bật ẩn khi muốn |
| 10 | Admin toàn cục và các Trưởng ban khi số bị ẩn | **Vẫn thấy số** |

## 8. Còn cần chốt

Không còn câu hỏi mở cho phần này.

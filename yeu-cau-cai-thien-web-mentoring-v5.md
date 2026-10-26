# Yêu cầu cải thiện Web quản trị Mentoring, vòng 5 (ngôn ngữ nghiệp vụ)

> **Phạm vi:** Phần lớn logic hiện tại đã đúng nghiệp vụ. Tài liệu này chỉ liệt kê ba điểm cần sửa hoặc bổ sung: **Dashboard và thu chi HLC Fund**, **giao diện MTE/MTO bị trùng danh sách**, và **chức năng thêm thành viên mới**.
>
> **Thuật ngữ:** **MTE** = Mentee. **MTO** = Mentor.

---

## 1. Dashboard và thu chi HLC Fund

### 1.1. Ánh xạ khoản chi phụ cấp từ điểm phụ cấp sang sổ quỹ

**Hiện trạng:** Dashboard thu chi của HLC Fund mới ghi nhận phần **thu** (minh chứng nộp quỹ). Phần **chi phụ cấp** phát sinh từ bảng tổng hợp điểm phụ cấp hằng tháng chưa được đưa sang, nên báo cáo thu chi không phản ánh đúng số tiền thực chi.

**Yêu cầu nghiệp vụ:**
- Khoản chi phụ cấp của mỗi kỳ tháng được **lấy tự động từ bảng tổng hợp phụ cấp tương ứng** (tổng tiền = điểm nhân đơn giá của kỳ đó), không nhập tay lại vào HLC Fund.
- Mỗi khoản chi trong sổ quỹ **gắn với mã bảng tổng hợp của kỳ** (ví dụ `PC-2026-10`), để từ khoản chi có thể mở ngược về bảng phụ cấp gốc.
- Khoản chi **chỉ được ghi vào sổ quỹ khi đã chi trả thực tế** (ngày chi, thường là mùng 10), không ghi ngay khi chốt bảng phụ cấp. Bảng đã chốt nhưng chưa chi thì **chưa tính vào tổng chi** của quỹ.
- Cần có thao tác **"Xác nhận đã chi"** trên bảng tổng hợp phụ cấp. Khi xác nhận, hệ thống ghi **ngày chi thực tế** và sinh khoản chi tương ứng trong sổ quỹ; ngày chi này là mốc để tính thu chi theo tháng và theo quý của quỹ.
- Các **dòng điều chỉnh bù** (khi bảng tháng trước có sai sót) cũng được ghi nhận thành khoản chi hoặc khoản giảm chi ở **tháng được bù**, kèm lý do.
- Một bảng phụ cấp chỉ sinh **một khoản chi** trong sổ quỹ, không ghi trùng khi bảng được mở lại hoặc xuất lại.

### 1.2. Cập nhật việc ánh xạ thông tin vào Dashboard

**Yêu cầu nghiệp vụ:**
- Dashboard thu chi cho phép xem **theo tháng và theo quý**, với ba số chính: **tổng thu, tổng chi, chênh lệch (số dư)**.
- Phân tách **nguồn thu** (nhóm MTE, nhóm HLC Fund của MTO, thầy cô ngoài danh sách) và **loại chi** (chi phụ cấp, các khoản chi khác nếu có).
- Có bộ lọc theo **loại nhóm**, **tháng**, **quý**.
- Số liệu trên Dashboard phải **khớp với bảng tổng hợp phụ cấp** và **khớp với file PDF, Excel** xuất ra cho cùng kỳ.
- Khi bảng phụ cấp được xác nhận đã chi hoặc có điều chỉnh bù, Dashboard **cập nhật theo** mà không cần thao tác tay.

---

## 2. Giao diện MTE và MTO bị trùng danh sách

**Hiện trạng:** Màn hình của vai trò MTE và MTO đang có **hai danh sách cùng nội dung**: **"Lịch sử / đã qua"** và **"Danh sách ghép cặp theo quý"**.

**Yêu cầu nghiệp vụ:**
- **Bỏ danh sách "Lịch sử / đã qua"**, chỉ giữ **"Danh sách ghép cặp theo quý"**.
- Mọi thông tin người dùng đang xem được ở "Lịch sử / đã qua" (buổi mentoring đã diễn ra, trạng thái recap, kết quả duyệt hoặc điểm) phải **xem được từ danh sách theo quý**, để việc bỏ danh sách không làm mất khả năng tra cứu.
- Danh sách theo quý cho phép **chọn quý và tháng**, mặc định hiển thị **quý hiện tại**; các quý trước truy cập qua bộ lọc.
- "Lịch sắp tới" chỉ gồm các buổi từ hiện tại trở đi (đã nêu ở vòng 1), không lẫn vào danh sách theo quý.

**Tiêu chí hoàn thành:** Mỗi vai trò chỉ còn **một nơi duy nhất** để xem các cặp và buổi mentoring theo quý, và không có thông tin nào bị mất so với trước.

---

## 3. Thêm thành viên mới (MTE, MTO)

### 3.1. Chức năng thêm thành viên

**Yêu cầu nghiệp vụ:**
- Chỉ **Admin toàn cục** được **thêm thành viên mới** (MTE hoặc MTO) trực tiếp trên web, không cần nhập file. Các Admin khác không có quyền này.
- Chỉ nhập **một số trường thông tin cá nhân cơ bản**:
  - **Bắt buộc:** họ và tên, giới tính, ngày tháng năm sinh, **loại thành viên** (MTE hoặc MTO, để sinh mã), quê quán và địa chỉ (mỗi trường chọn **một trong 34 tỉnh, thành phố** hiện nay của Việt Nam).
  - **Thông tin liên hệ (bắt buộc):** số điện thoại và email.
  - **Tùy chọn:** số CCCD, số tài khoản ngân hàng (kèm **tên ngân hàng chọn từ danh sách ngân hàng đang hoạt động tại Việt Nam**).
  - Số CCCD và số tài khoản là **dữ liệu nhạy cảm**: chỉ Admin toàn cục và chính chủ xem được; việc xem, sửa, xuất ra file đều ghi nhật ký (khớp quy định đã chốt cho thông tin ngân hàng).
- Các thông tin còn lại (link profile...) **bổ sung sau**, theo quy định đã chốt: link profile do Admin sửa.
- **Mã thành viên do hệ thống tự sinh**, người nhập không tự đặt mã.
- Thành viên mới được **tạo kèm tài khoản đăng nhập và mật khẩu khởi tạo ngay khi tạo**; **tên đăng nhập là mã thành viên**, giống các tài khoản hiện có. Yêu cầu đổi mật khẩu ở lần đăng nhập đầu vẫn tạm ẩn, chỉ bật khi lên production như đã chốt.
- Mọi thành viên mới là MTE phải **được gán vào một nhóm** theo quy tắc "thành viên bắt buộc có nhóm" đã chốt ở vòng trước.
- Hệ thống **cảnh báo trùng người** khi **họ tên và ngày sinh** trùng với hồ sơ đã có (kể cả hồ sơ ngừng hoạt động), hiển thị hồ sơ đã tồn tại để Admin toàn cục đối chiếu trước khi quyết định tiếp tục hay hủy.
- Nếu **số CCCD trùng** với một hồ sơ đã có, hệ thống **chặn hẳn**, không cho lưu, và báo rõ hồ sơ đã tồn tại.
- Việc thêm thành viên được **ghi nhật ký** (ai thêm, lúc nào).

### 3.2. Quy tắc sinh mã thành viên

**Quy tắc đã chốt:** Mã có dạng **`HLC-[chức vụ]-xxxxx`**, trong đó `xxxxx` là **5 chữ số**, giữ nguyên như dữ liệu cũ (ví dụ `HLC-MTE-00220`, `HLC-MTO-00318`). Số thứ tự được sinh theo cách: **đếm toàn bộ hồ sơ thành viên (MTE và MTO), kể cả hồ sơ đã ngừng hoạt động, rồi cộng 1** mỗi khi có hồ sơ mới.

**Cách hiểu nghiệp vụ:**
- Số thứ tự là **một dãy số chung cho cả MTE và MTO** (không đếm riêng từng loại). Phần `[chức vụ]` là `MTE` hoặc `MTO` tùy loại thành viên được thêm.
- Thành viên ngừng hoạt động **vẫn được giữ hồ sơ** (chuyển trạng thái *ngừng hoạt động*, **không xóa cứng**) và **vẫn được tính vào tổng**. Nhờ vậy mã của họ không bao giờ được cấp lại cho người khác.
- Mã **duy nhất và không đổi** suốt thời gian thành viên tồn tại.
- **Điều kiện để cách tính này đúng:** tổng số hồ sơ (kể cả ngừng hoạt động) phải **khớp với số thứ tự lớn nhất đã dùng**, tức không có mã bị bỏ trống hoặc đã bị xóa cứng.
- **Khi không khớp** (tổng hồ sơ cộng 1 không ra số kế tiếp sau mã gần nhất, hoặc mã tính ra đã tồn tại): hệ thống **cảnh báo** và dùng **phương án thay thế: lấy mã lớn nhất hiện có cộng 1**.
- Nếu phương án thay thế **vẫn bị trùng mã**, hệ thống **không cho thêm thành viên** và báo lỗi để xử lý dữ liệu, không tự sinh mã tiếp.
- Việc cấp mã phải an toàn khi có hai thao tác thêm cùng lúc, không để hai người nhận cùng một mã.

---

## 4. Bảng tổng hợp ưu tiên đề xuất

| Mức | Hạng mục | Lý do |
|---|---|---|
| **Cao** | Ánh xạ khoản chi phụ cấp vào sổ quỹ và Dashboard | Báo cáo thu chi hiện chưa phản ánh đúng thực chi |
| **Cao** | Sinh mã bằng bộ đếm chung, khởi tạo đúng giá trị | Mã trùng sẽ làm sai toàn bộ liên kết dữ liệu và điểm |
| **Trung bình** | Chức năng thêm thành viên mới | Giảm phụ thuộc nhập file khi có người mới |
| **Thấp hơn** | Bỏ danh sách "Lịch sử / đã qua" | Làm gọn giao diện, cần chắc chắn không mất thông tin |

---

## 5. Các quyết định đã chốt

| # | Nội dung | Quyết định |
|---|---|---|
| 1 | Thời điểm ghi khoản chi phụ cấp vào sổ quỹ | **Chỉ khi đã chi trả thực tế** |
| 2 | Số chữ số của mã thành viên | **5 chữ số**, giữ như dữ liệu cũ |
| 3 | Cách sinh mã | **Đếm tất cả hồ sơ, kể cả đã ngừng hoạt động, rồi cộng 1** cho mỗi hồ sơ mới; không xóa cứng hồ sơ |
| 4 | Người được thêm thành viên | **Chỉ Admin toàn cục** |
| 5 | Tài khoản cho thành viên mới | **Có**, tạo tài khoản và mật khẩu khởi tạo ngay khi tạo |
| 6 | Khi nghi ngờ trùng người | **Cảnh báo trùng** theo họ tên và ngày sinh (thay cho quyết định chặn tạo trước đó) |
| 7 | Trường khi thêm thành viên | **Bắt buộc:** họ tên, giới tính, ngày sinh, quê quán, địa chỉ (34 tỉnh, thành phố), số điện thoại, email. **Tùy chọn:** số CCCD, số tài khoản và ngân hàng |
| 8 | Người xác nhận đã chi trên bảng phụ cấp | **Admin toàn cục** (cao nhất) và **trưởng ban HLC Fund** |
| 9 | Khi cách đếm tổng + 1 không khớp mã gần nhất | **Cảnh báo**, dùng **mã lớn nhất + 1**; nếu vẫn trùng thì **không cho thêm** |
| 10 | Trùng số CCCD | **Chặn hẳn** |
| 11 | Thông tin liên hệ | **Đưa vào form, bắt buộc** (số điện thoại, email) |
| 12 | Tên đăng nhập của thành viên mới | **Mã thành viên**, như các tài khoản khác |

### Hệ quả cần đưa vào thiết kế

- **Chi thực tế:** bảng phụ cấp cần thêm bước **"Xác nhận đã chi"** (có ngày chi, người xác nhận, nhật ký). Chỉ sau bước này khoản chi mới vào sổ quỹ và Dashboard. Nên gắn quyền xác nhận chi với người được chỉ định, tách khỏi quyền sửa điểm.
- **Chi vắt qua tháng:** vì chi vào mùng 10 của tháng sau, khoản chi phụ cấp của điểm tháng 9 sẽ rơi vào **tháng 10** trong sổ quỹ. Dashboard theo tháng cần dựa trên **ngày chi thực tế**, và nên cho xem thêm theo **kỳ phụ cấp** để đối chiếu.
- **Cách sinh mã:** hồ sơ ngừng hoạt động phải luôn được **giữ lại** để còn được đếm. Hệ thống cần cấp mã an toàn khi nhiều thao tác thêm cùng lúc, và luôn kiểm tra mã chưa tồn tại trước khi lưu. Cần có **màn hình hoặc thông báo cảnh báo** khi phải dùng phương án mã lớn nhất + 1, và thông báo lỗi rõ khi bị chặn thêm.
- **Cảnh báo trùng:** vì họ tên kết hợp ngày sinh có thể trùng giữa hai người thật, hệ thống chỉ **cảnh báo**, không chặn cứng. Quyết định tiếp tục thuộc Admin toàn cục. Riêng trường hợp **trùng số CCCD** thì **chặn hẳn**, vì đó gần như chắc chắn là cùng một người. Vì CCCD là trường tùy chọn, hệ thống chỉ kiểm tra khi hồ sơ có nhập số này.
- **Xác nhận đã chi:** người xác nhận chỉ gồm **Admin toàn cục** và **trưởng ban HLC Fund**, tách riêng khỏi quyền sửa điểm. Mỗi lần xác nhận ghi ngày chi, người xác nhận và nhật ký.
- **Dữ liệu nhạy cảm (CCCD, số tài khoản):** hạn chế quyền xem, ghi nhật ký khi xem hoặc xuất, và không hiển thị đầy đủ trong danh sách, báo cáo hay file xuất cho người không có quyền.
- **Tài khoản khởi tạo:** mật khẩu khởi tạo chỉ hiển thị cho người tạo ở lần tạo; không lưu dạng đọc được.

## 6. Còn cần chốt

Không còn câu hỏi mở cho phần này.

---

## 7. Bổ sung: chốt kỳ và mở khóa kỳ phụ cấp (giai đoạn thử nghiệm)

**Bối cảnh:** Hệ thống đang chạy thử nghiệm, dữ liệu và điểm vẫn có thể phải sửa, nên không thể khóa cứng kỳ phụ cấp sau khi chốt.

**Yêu cầu nghiệp vụ:**
- **Chốt kỳ phụ cấp vẫn có thể mở khóa lại**. Không có trạng thái khóa vĩnh viễn; kỳ đã chốt có thể được mở khóa để sửa điểm, đơn giá, rồi chốt lại.
- Mở khóa phải **ghi nhật ký** (ai mở, lúc nào, lý do) và sau khi sửa, bảng tổng hợp **tính lại** đúng theo dữ liệu mới.
- Việc khóa **không phụ thuộc cứng vào lịch ngày**: không có trường hợp kỳ bị khóa từ một ngày cố định và chỉ mở lại khi sang mùng 1 tháng sau với hạn đến mùng 10 tháng sau, khiến kỳ đang sai không sửa được.
- Quyền mở khóa chỉ giao cho **người được chỉ định** (đề xuất: Admin toàn cục).
- Có **công tắc cấu hình** để bật/tắt chế độ này: trong giai đoạn thử nghiệm **cho phép mở khóa tự do**; khi lên production **siết lại** (ví dụ chỉ mở khóa được khi kỳ chưa xác nhận đã chi, hoặc cần lý do bắt buộc), không phải sửa lại chức năng.
- Khi kỳ **đã xác nhận đã chi** (khoản chi đã vào sổ quỹ) mà vẫn mở khóa để sửa, phần chênh lệch xử lý bằng **dòng điều chỉnh bù ở tháng sau** như đã chốt, để sổ quỹ không bị lệch.

**Cần xác nhận:** Phần mô tả lịch "kỳ chỉ mở khi sang mùng 1 tháng sau, hạn tới mùng 10 tháng sau" tôi hiểu là **trường hợp cần tránh**. Nếu ý bạn là **lịch vận hành chính thức** (kỳ tháng x mở chốt từ mùng 1 tháng x+1 và có hạn chốt, chi đến mùng 10 tháng x+1) thì cần ghi rõ hai mốc này, và việc mở khóa ngoài mốc vẫn được phép trong giai đoạn thử nghiệm.

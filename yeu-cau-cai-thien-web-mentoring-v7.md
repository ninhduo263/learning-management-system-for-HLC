# Yêu cầu cải thiện Web quản trị Mentoring, vòng 7 (ngôn ngữ nghiệp vụ)

> **Phạm vi:** Phần lớn logic hiện tại đã đúng nghiệp vụ. Tài liệu này tập trung vào **quản lý hồ sơ thành viên**, **định nghĩa điểm trung bình** và **giao diện vai trò, điểm** trong phần Tổ chức và phân quyền.
>
> **Thuật ngữ:** **MTE** = Mentee. **MTO** = Mentor.

---

## 1. Quản lý hồ sơ thành viên

### 1.1. Ngành học và ngành nghề: chọn từ danh sách chuẩn

**Yêu cầu nghiệp vụ:**
- Hai trường **ngành học** và **ngành nghề** là **ô chọn từ danh sách có sẵn**, không nhập tự do, và **cho chọn nhiều nhóm** cùng lúc.
- Danh sách gồm **38 nhóm ngành nghề** (liệt kê ở phụ lục, đã được xác nhận là đủ dùng). Mỗi nhóm gộp nhiều ngành gần nhau (ví dụ "Công nghệ Thông tin/Máy tính").
- Ô chọn có **ô tìm kiếm** để lọc nhanh theo từ khóa.
- Danh sách do hệ thống quản lý chung để mọi thành viên dùng **cùng một cách viết**, thuận lợi cho thống kê và **gợi ý ghép cặp theo ngành học, ngành nghề** (đã nêu ở vòng 4). Vì một người có thể chọn nhiều nhóm, việc gợi ý ghép cặp xét **mức trùng khớp** giữa các nhóm đã chọn của MTE và MTO.
- Dữ liệu cũ nhập tự do (nếu có) cần được **rà soát và quy đổi** về nhóm phù hợp; hồ sơ không khớp được đánh dấu để thành viên hoặc Admin chọn lại.
- Danh sách phải **cập nhật được** (thêm, đổi tên, ẩn nhóm) mà không làm hỏng dữ liệu đã lưu.

### 1.2. Ngân hàng: chọn từ danh sách ngân hàng tại Việt Nam

**Yêu cầu nghiệp vụ:**
- Trường **ngân hàng** (đi kèm số tài khoản) là **ô chọn một trong các ngân hàng đang hoạt động tại Việt Nam** hiện nay, **kể cả ngân hàng tư nhân**.
- Điều kiện của danh sách: ngân hàng phải **nhận được tiền chi trả chuyển từ MB Bank** (tài khoản chi phụ cấp). Ngân hàng nào không nhận được chuyển khoản từ MB Bank thì **không đưa vào danh sách**.
- Có **ô tìm kiếm** theo tên ngân hàng.
- Danh sách cập nhật được khi có ngân hàng sáp nhập, đổi tên.
- Số tài khoản vẫn là dữ liệu nhạy cảm theo quy định đã chốt (hạn chế người xem, ghi nhật ký khi xem, sửa, xuất).

### 1.3. Sửa hồ sơ: bản nháp, nhấn Lưu, duyệt thay đổi nhạy cảm

**Mục đích:** Tránh dữ liệu chưa kiểm tra (đặc biệt số tài khoản) chảy sang bảng phụ cấp, đồng thời tránh người sửa quên lưu.

**Quy trình:**

| Bước | Ý nghĩa |
|---|---|
| **Bản nháp** | Khi sửa bất kỳ dòng nào trên hồ sơ, hệ thống ghi nhận thành bản nháp, chỉ chính chủ thấy |
| **Nhấn Lưu** | Thay đổi **không nhạy cảm** thành **bản chính thức ngay**. Thay đổi **nhạy cảm** chuyển sang trạng thái **chờ duyệt** |
| **Duyệt** | **Admin toàn cục** duyệt thay đổi nhạy cảm (có thể **ủy quyền** cho người khác). Được duyệt thì thành bản chính thức, bị từ chối thì giữ nguyên thông tin cũ |

**Các trường nhạy cảm cần duyệt:** **số tài khoản, ngân hàng, số CCCD** (danh sách có thể điều chỉnh sau; các trường còn lại như địa chỉ, ngành học, ngành nghề, liên hệ không cần duyệt).

**Yêu cầu nghiệp vụ:**
- **Các trang khác chỉ lấy bản chính thức**. Bản nháp và thay đổi đang chờ duyệt **không** tác động đến báo cáo hay bảng phụ cấp; trong thời gian chờ, hệ thống vẫn dùng **thông tin chính thức cũ**.
- Người duyệt xem được **giá trị cũ và giá trị mới**, rồi **duyệt hoặc từ chối** (từ chối kèm lý do). Người sửa nhìn thấy **trạng thái** (chờ duyệt, đã duyệt, bị từ chối) trên hồ sơ của mình.
- **Ủy quyền duyệt:** Admin toàn cục chỉ định người được duyệt thay, có phạm vi và thời hạn; mọi lần duyệt thay ghi rõ **"duyệt thay cho ai"**.
- **Cảnh báo để người sửa không quên lưu:**
  - Khi có thay đổi chưa lưu mà người dùng **rời trang, đóng trang hoặc đăng xuất**, hiển thị cảnh báo hỏi lưu hay bỏ.
  - Trang hồ sơ hiển thị **dấu hiệu rõ ràng** "có thay đổi chưa lưu" cạnh các dòng đã sửa.
  - Khi quay lại hồ sơ và còn bản nháp chưa lưu, hiển thị nhắc nhở để tiếp tục hoặc hủy bản nháp.
- Có thể **hủy bản nháp** để quay về bản chính thức.
- Mỗi lần thay đổi bản chính thức **ghi nhật ký** (ai sửa, ai duyệt nếu có, lúc nào, giá trị cũ và mới), đặc biệt với thông tin ngân hàng.
- Link profile vẫn **chỉ Admin sửa** theo quy định đã chốt.

**Thay đổi số tài khoản quanh thời điểm chi trả:**
- Trong khoảng **từ lúc chốt kỳ đến lúc chi trả** (thường đến mùng 10), thành viên **vẫn được gửi thay đổi số tài khoản**, nhưng thay đổi đã duyệt **chỉ áp dụng từ kỳ sau**, để tránh chi nhầm tài khoản của kỳ đang chờ chi.

### 1.4. Ánh xạ thông tin hồ sơ sang các trang khác

**Yêu cầu nghiệp vụ:**
- Thông tin hồ sơ chính thức được **tham chiếu** sang các trang cần dùng, không sao chép nhập lại.
- Ví dụ **bảng tổng hợp điểm phụ cấp** hiển thị: **họ tên, mã thành viên, chức vụ, số tài khoản, ngân hàng**.
- Các nơi khác cần ánh xạ tương tự khi cần: danh sách nhóm, danh sách ghép cặp, file xuất Excel và PDF của bảng phụ cấp, dashboard.
- Khi hồ sơ chính thức thay đổi thì các nơi tham chiếu **cập nhật theo**, **trừ bảng phụ cấp đã chốt**: kỳ đã chốt thì **thông tin trong bảng không cho thay đổi**, giữ nguyên như lúc chốt, và thay đổi hồ sơ sau thời điểm chốt chỉ áp dụng cho **các kỳ sau**. **Ngoại lệ:** khi kỳ được **mở khóa** (chế độ thử nghiệm), bảng **được cập nhật theo hồ sơ chính thức mới**, **riêng số tài khoản và ngân hàng giữ theo kỳ bắt đầu áp dụng** của từng thay đổi (xem mục 1.3).
- Dữ liệu nhạy cảm (số tài khoản) khi ánh xạ chỉ hiển thị cho **người có quyền** (Trưởng ban HLC Fund, Admin toàn cục), không hiển thị trong các màn hình hoặc file xuất của người không có quyền.

---

## 2. Điểm trung bình

**Hiện trạng:** Cách hiểu "điểm trung bình" chưa được thống nhất.

**Yêu cầu nghiệp vụ:**
- "Điểm trung bình" là **điểm trung bình học tập của từng cá nhân MTE**, không phải điểm trung bình nhóm hay điểm phụ cấp.
- Điểm trung bình được **tính theo từng tháng**: mỗi MTE có **một giá trị điểm trung bình học tập cho mỗi tháng**, hiển thị ở dashboard điểm học tập trung bình đã yêu cầu ở vòng 6.
- Điểm này tổng hợp từ **các module học tập mà MTE được gán** và **điểm recap mentoring** (lấy trực tiếp từ dữ liệu mentoring, không sao chép).
- Có thể xem và so sánh điểm trung bình giữa các MTE, giữa các nhóm (tổng hợp từ điểm từng cá nhân), nhưng **đơn vị tính gốc luôn là từng MTE**.

---

## 3. Giao diện vai trò và điểm trong "Tổ chức và phân quyền"

**Hiện trạng:** Giao diện phần **vai trò** và phần **điểm** trong route Tổ chức và phân quyền chưa đẹp và chưa dễ dùng.

**Yêu cầu nghiệp vụ (tiêu chí hoàn thành):**
- **Một màn hình, một việc rõ ràng:** phần vai trò (chức vụ, quyền, điểm phụ cấp, ngưỡng thưởng) và phần điểm được **trình bày tách bạch**, không lẫn lộn.
- Người quản trị nhìn vào **thấy ngay** chức vụ nào có quyền gì và nhận bao nhiêu điểm, không phải mở nhiều lớp cửa sổ.
- Danh sách chức vụ và quyền hiển thị **dạng bảng dễ đọc**, có **tìm kiếm** và **bộ lọc** theo loại nhóm, trạng thái.
- Giảm bớt cửa sổ popup; **bỏ trường điều kiện logic** khỏi giao diện (đã chốt ở vòng 4).
- Giao diện **nhất quán** về màu sắc, cỡ chữ, nút bấm với các màn hình khác và dùng được tốt trên **điện thoại**.
- Thao tác nhạy cảm (xóa, gỡ chức vụ, đổi điểm) có **xác nhận rõ ràng**.

---

## 4. Bảng tổng hợp ưu tiên đề xuất

| Mức | Hạng mục | Lý do |
|---|---|---|
| **Cao** | Bản nháp, gửi duyệt, bản chính thức, cảnh báo quên lưu | Tránh dữ liệu sai chảy sang bảng phụ cấp |
| **Cao** | Ánh xạ hồ sơ sang bảng điểm phụ cấp (tên, mã, chức vụ, STK, ngân hàng) | Cần cho chi trả mùng 10 |
| **Trung bình** | Ngành học, ngành nghề chọn từ danh sách | Chuẩn hóa dữ liệu, phục vụ gợi ý ghép cặp |
| **Trung bình** | Ngân hàng chọn từ danh sách | Tránh nhập sai tên ngân hàng khi chi trả |
| **Trung bình** | Định nghĩa điểm trung bình theo từng MTE | Cần cho dashboard điểm học tập |
| **Thấp hơn** | Làm đẹp giao diện vai trò và điểm | Dễ dùng hơn, không ảnh hưởng số liệu |

---

## 5. Các quyết định đã chốt

| # | Nội dung | Quyết định |
|---|---|---|
| 1 | Chọn một hay nhiều ngành | **Chọn nhiều** |
| 2 | Danh sách 38 nhóm ngành nghề | **Đủ dùng**, giữ nguyên |
| 3 | Danh sách ngân hàng | **Mọi ngân hàng đang hoạt động tại Việt Nam, kể cả tư nhân**, miễn là nhận được tiền chi trả từ MB Bank |
| 4 | Duyệt thay đổi hồ sơ | **Chỉ thay đổi nhạy cảm** (số tài khoản, ngân hàng, CCCD) cần duyệt; **Admin toàn cục** duyệt và **có thể ủy quyền** |
| 5 | Hồ sơ đổi sau khi chốt kỳ | **Kỳ đã chốt thì không cho thay đổi** thông tin trong bảng |
| 6 | Kỳ tính điểm trung bình | **Theo tháng** |
| 7 | Kỳ đã chốt được mở khóa | Bảng **được cập nhật theo hồ sơ mới** |
| 8 | Gửi đổi số tài khoản từ lúc chốt đến lúc chi | **Vẫn cho gửi**, chỉ áp dụng từ kỳ sau |
| 9 | Mở khóa kỳ cũ mà số tài khoản đã đổi sau khi chốt | **Giữ số tài khoản theo kỳ bắt đầu áp dụng**; tên, chức vụ... cập nhật theo hồ sơ hiện tại |
| 10 | Trường nhạy cảm cần duyệt | **Số tài khoản, ngân hàng, CCCD** là đủ |

### Hệ quả cần đưa vào thiết kế

- **Danh sách ngân hàng:** cần lập và **kiểm tra thực tế** danh sách ngân hàng nhận được chuyển khoản từ MB Bank, vì đây là điều kiện để đưa ngân hàng vào danh sách. Ngân hàng sáp nhập hoặc đổi tên thì cập nhật.
- **Quy trình duyệt hồ sơ:** cần một **danh sách chờ duyệt** cho Admin toàn cục và người được ủy quyền, hiển thị giá trị cũ và mới, và thông báo kết quả cho người sửa. Thay đổi không nhạy cảm không đi qua danh sách này.
- **Bảng phụ cấp đã chốt:** lưu **bản chụp thông tin tại thời điểm chốt** (tên, mã, chức vụ, số tài khoản, ngân hàng) để thay đổi hồ sơ sau đó không làm lệch bảng đã chốt. Khi kỳ được mở khóa, bản chụp được **làm mới theo hồ sơ chính thức hiện tại**, trừ số tài khoản và ngân hàng giữ theo kỳ áp dụng; khi chốt lại, bản chụp mới được lưu.
- **Hiệu lực theo kỳ của số tài khoản:** mỗi thay đổi số tài khoản đã duyệt cần ghi **kỳ bắt đầu áp dụng** để hệ thống dùng đúng tài khoản cho từng kỳ.
- **Ngành chọn nhiều:** gợi ý ghép cặp theo ngành xét mức trùng khớp giữa nhiều nhóm đã chọn, không so sánh một giá trị với một giá trị.
- **Điểm trung bình theo tháng:** gắn với kỳ tháng như bảng phụ cấp, để đối chiếu cùng kỳ.

## 6. Còn cần chốt

Không còn câu hỏi mở cho phần này.

---

## Phụ lục: Danh sách 38 nhóm ngành nghề (chép từ ảnh chụp)

| # | Nhóm ngành nghề | # | Nhóm ngành nghề |
|---|---|---|---|
| 1 | An ninh/Quốc phòng/Quân sự | 20 | Quản trị Kinh doanh/Nhân sự |
| 2 | Báo chí/Quan hệ công chúng | 21 | Tài chính/Ngân hàng/Bảo hiểm |
| 3 | In ấn/Xuất bản/Thông tin | 22 | Thương mại/Marketing/Bán hàng |
| 4 | Truyền thông/Sự kiện/Multimedia | 23 | Giao thông/Vận tải/Logistics |
| 5 | Giáo dục/Đào tạo/Sư phạm | 24 | Quản lý Đô thị/Bất động sản |
| 6 | Nhân học/Lịch sử/Văn hóa | 25 | Xây dựng/Kiến trúc/Quy hoạch |
| 7 | Tâm lý học/Công tác Xã hội | 26 | Dinh dưỡng/Trị liệu/Sức khỏe |
| 8 | Tôn giáo/Huyền học/Thần học | 27 | Y học Cổ truyền/Dược liệu |
| 9 | Triết học/Xã hội học/Chính trị | 28 | Y tế/Dược học/Điều dưỡng |
| 10 | Luật/Tư pháp/Hành chính | 29 | Thẩm mỹ/Spa/Làm đẹp |
| 11 | Ngôn ngữ/Văn hóa Quốc tế | 30 | Thể dục/Thể thao/Giải trí |
| 12 | Ngoại giao/Quan hệ Quốc tế | 31 | Âm nhạc/Sân khấu/Biểu diễn |
| 13 | Công nghệ Thông tin/Máy tính | 32 | Công nghiệp Giải trí/Nội dung số |
| 14 | Điện/Điện tử Viễn thông | 33 | Hội họa/Nhiếp ảnh/Điện ảnh |
| 15 | Khí tượng/Thủy văn/Hải dương | 34 | Mỹ thuật/Thiết kế/Thời trang |
| 16 | Khoa học Tự nhiên/Môi trường | 35 | Du lịch/Nhà hàng/Khách sạn |
| 17 | Năng lượng/Vật liệu mới | 36 | Cơ khí/Chế tạo máy/Tự động hóa |
| 18 | Tài nguyên/Khoáng sản/Địa chất | 37 | Nông nghiệp/Lâm nghiệp/Thủy sản |
| 19 | Kế toán/Kiểm toán/Thống kê | 38 | Sản xuất/Gia công/Chế biến |

*Thứ tự đánh số theo cách các ảnh nối tiếp nhau; thứ tự thực tế trên web có thể khác.*

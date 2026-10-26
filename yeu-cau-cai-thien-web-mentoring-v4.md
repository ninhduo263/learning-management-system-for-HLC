# Yêu cầu cải thiện Web quản trị Mentoring, vòng 4 (ngôn ngữ nghiệp vụ)

> **Phạm vi:** Phần lớn logic hiện tại đã đúng nghiệp vụ. Tài liệu này liệt kê các **sai lệch cơ bản** và **chức năng cần bổ sung** ở các dịch vụ: **HLC Fund**, **Tổ chức và phân quyền**, **Học tập**, **Điểm phụ cấp**, **Mentoring** (gợi ý ghép cặp, ghép nhóm).
>
> **Thuật ngữ:** **MTE** = Mentee. **MTO** = Mentor. **Leader / Phó nhóm** = người giữ chức vụ quản lý nhóm.

---

## 1. HLC Fund

### 1.1. Nhóm thầy cô (MTO) chỉ có minh chứng nộp quỹ

**Hiện trạng:** Nhóm thầy cô/MTO đang mang cả các trường của mentoring và học tập, trong khi nhóm này chỉ tham gia đóng quỹ.

**Yêu cầu nghiệp vụ:**
- Nhóm thầy cô/MTO **chỉ có chức năng nộp và duyệt minh chứng đóng quỹ** (ảnh minh chứng, số tiền, thời gian, trạng thái).
- Thông tin của nhóm này **không hiển thị và không bắt buộc** các trường về mentoring, học tập (cặp, recap, module, điểm học tập).
- Nhóm này không tham gia các tính toán điểm của mentoring và học tập, chỉ tham gia **báo cáo thu chi quỹ**.

---

## 2. Tổ chức và phân quyền

### 2.1. Chức năng xóa nhóm

**Yêu cầu nghiệp vụ:**
- Admin có thể **xóa một nhóm** (nhóm MTE hoặc nhóm HLC Fund).
- Trước khi xóa, hệ thống hiển thị **số thành viên và dữ liệu liên quan** sẽ bị ảnh hưởng, và yêu cầu **xác nhận**.
- **Mỗi thành viên bắt buộc phải thuộc một nhóm.** Vì vậy khi xóa nhóm, hệ thống **yêu cầu chuyển toàn bộ thành viên sang nhóm khác** trước (có thể chuyển hàng loạt), và chỉ cho xóa khi nhóm đã trống. Không có trạng thái "chưa có nhóm".
- Nhóm đã có **dữ liệu đã chốt** (điểm, bảng phụ cấp đã chi) thì **không xóa cứng**, mà chuyển sang trạng thái **ngừng hoạt động** để giữ lịch sử đối soát.
- Ghi **nhật ký**: ai xóa, nhóm nào, lúc nào.

### 2.2. Bổ sung chức năng xóa trong "Phân quyền" và "Gán vị trí"

**Yêu cầu nghiệp vụ:**
- Cho phép **xóa vai trò** và **gỡ chức vụ đã gán** cho một người.
- Gỡ chức vụ phải ghi **ngày kết thúc hiệu lực**, để điểm phụ cấp của kỳ đó vẫn tính đúng theo thời gian giữ chức.
- Vai trò **đang được gán cho người khác** thì không xóa được, hệ thống báo rõ còn bao nhiêu người đang giữ.
- Mọi thao tác xóa, gỡ đều có **nhật ký**.

### 2.3. Xuất danh sách thành viên (bản đầy đủ)

**Yêu cầu nghiệp vụ:**
- Thêm nút **xuất file xlsx danh sách thành viên** (MTE, MTO) ở **bản đầy đủ** các trường hồ sơ.
- File gồm cả thông tin **nhóm, chức vụ, trạng thái hoạt động**.
- Nội dung nhạy cảm (số tài khoản, thông tin cá nhân) chỉ xuất cho **người có quyền phù hợp**, và việc xuất được **ghi nhật ký**.

### 2.4. Chỉnh sửa hồ sơ cá nhân (giao diện MTE, MTO)

**Yêu cầu nghiệp vụ:**

**a) Đổi mật khẩu**
- MTE và MTO **tự đổi mật khẩu** của mình trong trang hồ sơ cá nhân (nhập mật khẩu hiện tại, mật khẩu mới, xác nhận mật khẩu mới).
- Mật khẩu mới phải đáp ứng **quy tắc độ mạnh tối thiểu** do hệ thống quy định, và **không trùng** mật khẩu hiện tại.
- Có thông báo rõ ràng khi đổi thành công hoặc thất bại, bằng ngôn ngữ dễ hiểu.
- **Yêu cầu bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên:** thiết kế sẵn nhưng **tạm ẩn** trong giai đoạn thử nghiệm; **chỉ bật khi hệ thống lên môi trường chính thức (production)**. Việc bật/tắt do Admin toàn cục điều khiển bằng một **công tắc cấu hình**, không cần can thiệp lập trình.

**b) Link profile: tạm thời chỉ Admin được sửa**
- MTE và MTO **chỉ xem**, **không tự sửa** link profile.
- Chỉ **Admin** được chỉnh sửa link profile của thành viên.
- Mọi thay đổi link profile do Admin thực hiện được **ghi nhật ký** (ai sửa, lúc nào, giá trị cũ và mới).
- Quy định này mang tính **tạm thời**; thiết kế cần để dễ mở lại quyền tự sửa cho MTE, MTO sau này.

**c) Quê quán và địa chỉ: chọn từ danh mục 34 tỉnh, thành phố sau sáp nhập**
- Hai trường **quê quán** và **địa chỉ** là **ô chọn một giá trị** trong **danh mục 34 đơn vị hành chính cấp tỉnh (tỉnh, thành phố) sau sáp nhập**, không nhập tự do.
- Danh mục do hệ thống quản lý chung, để tất cả thành viên dùng **cùng một cách viết**, thuận lợi cho thống kê và **gợi ý ghép cặp theo địa điểm** (mục 5.1).
- Dữ liệu cũ đã nhập tự do (nếu có) cần được **rà soát và quy đổi** về đúng đơn vị trong danh mục; hồ sơ không khớp được đánh dấu để thành viên hoặc Admin chọn lại.
- Danh mục cần **cập nhật được** khi có thay đổi hành chính về sau, mà không làm hỏng dữ liệu đã lưu.

---

## 3. Học tập

### 3.1. Gán module học tập cho mentee hoặc mentor cụ thể

**Hiện trạng:** Module học tập được áp dụng chung, chưa chọn được đối tượng.

**Yêu cầu nghiệp vụ:**
- Khi cấu hình một module học tập, Admin có thể **gán module cho một số MTE hoặc MTO cụ thể** (chọn từng người, hoặc chọn theo nhóm).
- Chỉ những người được gán **mới thấy và nộp bài** trong module đó. Người không được gán **hoàn toàn không thấy** module (không hiển thị tên, nội dung hay bài nộp).
- Có thể **thêm hoặc bớt người** được gán sau khi module đã mở; bài đã nộp trước đó **được giữ nguyên**.
- Người không được gán **không bị tính thiếu bài** của module đó trong tỷ lệ hoàn thành và điểm.

---

## 4. Điểm phụ cấp

### 4.1. Rule điểm đang bị tính hai lần (Leader nhận gấp đôi)

**Hiện trạng:** Cùng một chức vụ (ví dụ Leader) được **tạo rule ở hai nơi**: ở phần *Tổ chức và phân quyền* và ở phần *Cấu hình loại điểm và quy tắc* của điểm phụ cấp. Khi tính tháng, hai rule cùng cộng điểm nên Leader nhận **gấp đôi** so với thực tế.

**Quyết định:** chọn **phương án B**. Bắt buộc **mỗi loại điểm chỉ có một nơi định nghĩa**:

| Phương án | Cách tổ chức | Nhận xét |
|---|---|---|
| **A. Thống nhất về một nơi** | Toàn bộ rule điểm (chức vụ lẫn thưởng) cấu hình ở **một màn hình duy nhất** | Đơn giản nhất, ít rủi ro lệch |
| **B. Chia theo bản chất (khuyến nghị)** | **Phân quyền và chức vụ** giữ **rule điểm của chức vụ** (Leader, Phó nhóm, trưởng ban...). **Điểm phụ cấp** chỉ cấu hình **rule thưởng** (nhất, nhì, ba, mentoring sớm...) | Đúng với cách vận hành: chức vụ đi cùng người, thưởng đi cùng kết quả |

**Yêu cầu chung cho cả hai phương án:**
- Một chức vụ chỉ sinh **một khoản điểm** trong tháng, không trùng nguồn.
- Bảng tổng hợp ghi rõ **nguồn** của từng khoản điểm (chức vụ nào, rule nào) để kiểm tra trùng lặp.
- **Bỏ trường "điều kiện logic"** khỏi giao diện cấu hình (kể cả trong cửa sổ popup). Điều kiện tính điểm là **logic hệ thống**, người dùng chỉ chọn **tên loại điểm, số điểm, đối tượng áp dụng, trạng thái bật/tắt**.
- Lỗi cộng gấp đôi **chỉ sửa từ kỳ hiện tại trở đi**, không cần bù/trừ các tháng trước vì đó là dữ liệu kiểm thử.

### 4.2. Hiển thị cùng lúc bảng tổng hợp của hai tháng

**Hiện trạng:** Màn hình chỉ hiện bảng của tháng hiện tại, trong khi từ **ngày 1 đến ngày 10** còn bảng tháng cũ đang chờ chi.

**Yêu cầu nghiệp vụ:**
- Cho phép **mở hai bảng tổng hợp (tháng cũ và tháng mới) cùng lúc**, chọn **tùy chọn** (ví dụ chuyển đổi hoặc xem song song).
- Trong khoảng ngày 1 đến 10, hệ thống **gợi ý hoặc mặc định** hiện cả hai bảng.
- Mỗi bảng có **mã và trạng thái riêng** (đang chờ chi, đang tích lũy), thao tác ở bảng này không ảnh hưởng bảng kia.

---

## 5. Mentoring: gợi ý ghép cặp và ghép nhóm

### 5.1. Gợi ý ghép cặp MTE và MTO theo hồ sơ

**Mục đích:** Hỗ trợ Admin ghép cặp nhanh và phù hợp, thay vì ghép hoàn toàn thủ công.

**Yêu cầu nghiệp vụ:**
- Dựa trên **hồ sơ MTE và MTO**, hệ thống **nhóm các hồ sơ gần nhau** theo: **ngành nghề, ngành học, địa điểm chung** (và các tiêu chí khác Admin chọn).
- Hệ thống **gợi ý danh sách MTO phù hợp** cho từng MTE; **Admin là người quyết định cuối cùng**, hệ thống không tự ghép.
- Một MTO **có thể ghép với nhiều MTE nhưng không khuyến khích**. Khi gợi ý, MTO **đã có cặp được giảm thứ hạng ưu tiên** để ưu tiên MTO chưa có cặp; hệ thống **không chặn** nếu Admin vẫn chọn ghép thêm, chỉ hiển thị cảnh báo "MTO này đã có X cặp".
- Hiển thị **lý do gợi ý** (ví dụ cùng ngành, cùng khu vực) để Admin dễ cân nhắc.

**Điều kiện triển khai (cần quyết định theo tải hệ thống):**
- Nếu chức năng gợi ý **làm hệ thống chậm**, thì **tách thành dịch vụ riêng** (chạy nền, tính trước, không tính tức thời khi Admin mở màn hình).
- Nếu vẫn **quá nặng** sau khi tách, thì **bỏ chức năng gợi ý** và giữ ghép cặp thủ công, vì nghiệp vụ vẫn vận hành được.
- Với quy mô khoảng 40 MTE và 30 MTO đang hoạt động, đây là khối lượng nhỏ; nên thử ở mức đơn giản trước (chấm điểm tương đồng theo tiêu chí) rồi mới nâng cấp.

### 5.2. Gợi ý ghép nhóm cân bằng (làm sau, nếu 5.1 vẫn nhẹ)

**Yêu cầu nghiệp vụ:**
- Gợi ý chia thành viên vào các nhóm sao cho các nhóm **cân bằng số lượng người**.
- Đồng thời **cân bằng mức độ hoạt động**: mỗi nhóm có cả người hoạt động nhiều và ít, tránh dồn người hoạt động tốt vào một nhóm.
- Admin xem phương án, **chỉnh tay** rồi xác nhận mới áp dụng.

---

## 6. Quyền hạn theo chức vụ

> **Ghi chú:** Phần "Bảng tạm do nghiệp vụ đề xuất" là nội dung bạn đã nêu. Phần "Đề xuất bổ sung" là gợi ý để bạn cân nhắc, chưa phải quyết định.

### 6.1. Bảng tạm do nghiệp vụ đề xuất

| Chức vụ | Phạm vi quyền |
|---|---|
| **Trưởng ban HLC Fund** | Toàn quyền **HLC Fund** của cả MTO và MTE |
| **Trưởng ban MTE** | Toàn quyền **mọi hoạt động liên quan MTE**: điểm phụ cấp, điểm học tập, duyệt, chốt kỳ phần MTE; **xem, duyệt và quản lý tất cả nhóm MTE** |
| **Leader, Phó nhóm, Phó ban MTE** | **Chỉ duyệt**, **không được đổi thành viên nhóm** |
| **Leader, Phó nhóm** | Chỉ quản lý **trong nhóm MTE của mình** |
| **Trưởng ban Mentoring** | Quản lý **tất cả dịch vụ mentoring** |

### 6.2. Nguyên tắc xử lý logic phân quyền (do có dịch vụ mới và cách chia nhóm mới)

- Quyền được xác định theo **ba yếu tố**: *chức vụ*, *phạm vi* (toàn bộ, theo loại nhóm, theo nhóm của mình), và *hành động* (xem, duyệt, chấm, chỉnh sửa, xóa, xuất dữ liệu).
- Một người có thể **giữ nhiều chức vụ**; quyền cuối cùng là **tổng hợp** các chức vụ, nhưng **mỗi chức vụ chỉ tác động trong phạm vi của nó**.
- Quyền theo loại nhóm: chức vụ thuộc nhóm MTE **không tự có quyền** ở nhóm HLC Fund của MTO và ngược lại, trừ khi chức vụ đó được định nghĩa cho cả hai (ví dụ Trưởng ban HLC Fund).
- Giữ nguyên các ràng buộc đã chốt: **Leader, Phó nhóm không duyệt recap của MTO**, và **Leader HLC Fund (MTE) không phải thành viên nhóm**.

### 6.3. Đề xuất bổ sung (để cân nhắc)

| Nhóm quyền | Gợi ý |
|---|---|
| **Admin toàn cục (Super Admin)** | Toàn quyền, **là người duy nhất** được xóa nhóm, xóa vai trò, mở khóa kỳ đã chốt, nhập dữ liệu quý cũ |
| **Trưởng ban Học tập** | Quản lý **module học tập, thư viện, bài nộp hằng tuần** của ban học tập; gán module cho người cụ thể |
| **Phó ban HLC Fund** | **Duyệt minh chứng** quỹ, không đổi thành viên hay cấu hình |
| **Kế toán/phụ trách chi trả** | **Chỉ xem và xuất** bảng tổng hợp phụ cấp đã chốt; **không sửa điểm, đơn giá** |
| **Quyền "chốt kỳ"** | Tách riêng, chỉ giao cho **một số ít người** (ví dụ Super Admin, trưởng ban được chỉ định), vì chốt kỳ ảnh hưởng tiền chi trả |
| **Quyền "sửa đơn giá, điểm thủ công"** | Tách riêng, bắt buộc **ghi lý do và nhật ký** |
| **Quyền "nhập hộ, nộp hộ"** | Chỉ cho Admin của service tương ứng và Leader nhóm (đối với HLC Fund), có ghi rõ người nộp hộ |
| **Quyền "xuất dữ liệu cá nhân"** | Chỉ người có quyền cao, có nhật ký việc xuất |
| **Quyền "xem nhật ký thao tác"** | Chỉ Super Admin và người kiểm soát được chỉ định |
| **Chia sẻ quyền tạm thời (ủy quyền)** | Cho phép **ủy quyền có thời hạn** (ví dụ Leader vắng thì Phó nhóm thay), tự hết hiệu lực khi hết hạn và có nhật ký |
| **Tách "người chấm" và "người nhận điểm"** | Một người **không được chấm hoặc duyệt bài của chính mình**, hoặc của cặp mình tham gia, để tránh xung đột lợi ích |

---

## 7. Bảng tổng hợp ưu tiên đề xuất

| Mức | Hạng mục | Lý do |
|---|---|---|
| **Cao** | Sửa rule điểm bị tính hai lần (Leader gấp đôi); bỏ trường điều kiện logic khỏi UI | Sai tiền phụ cấp, cần sửa và bù cho các kỳ đã tính |
| **Cao** | Chuẩn hóa bảng phân quyền theo chức vụ và phạm vi | Nền tảng cho mọi dịch vụ mới |
| **Cao** | Hiển thị hai bảng tổng hợp tháng từ ngày 1 đến 10 | Cần cho kỳ chi trả mùng 10 |
| **Trung bình** | Nhóm thầy cô/MTO chỉ còn minh chứng quỹ | Làm sạch dữ liệu và giao diện |
| **Trung bình** | Xóa nhóm; xóa vai trò và gỡ chức vụ | Hoàn thiện quản trị |
| **Trung bình** | Gán module học tập cho người cụ thể | Mở rộng module học tập |
| **Trung bình** | Xuất xlsx danh sách thành viên đầy đủ | Phục vụ đối soát |
| **Trung bình** | Hồ sơ cá nhân: đổi mật khẩu, khóa sửa link profile, quê quán và địa chỉ theo danh mục 34 tỉnh | Chuẩn hóa dữ liệu, cần cho gợi ý ghép cặp theo địa điểm |
| **Thấp hơn** | Gợi ý ghép cặp theo hồ sơ | Làm theo hướng nhẹ, đo tải rồi quyết định |
| **Thấp hơn** | Gợi ý ghép nhóm cân bằng | Chỉ làm khi gợi ý ghép cặp chạy nhẹ |

---

## 8. Các quyết định đã chốt

| # | Nội dung | Quyết định |
|---|---|---|
| 1 | Rule điểm bị trùng | **Phương án B**: chức vụ cấu hình ở phân quyền, thưởng cấu hình ở điểm phụ cấp |
| 2 | Các tháng đã bị cộng gấp đôi | **Chỉ sửa từ hiện tại** (dữ liệu cũ là dữ liệu kiểm thử) |
| 3 | Xóa nhóm | Thành viên **bắt buộc phải có nhóm**, phải chuyển hết sang nhóm khác mới xóa được |
| 4 | Module học tập gán cho người cụ thể | Người không được gán **hoàn toàn không thấy** module |
| 5 | MTO ghép nhiều MTE | **Cho phép nhưng không khuyến khích** (giảm ưu tiên khi gợi ý, có cảnh báo) |
| 6 | Quyền Trưởng ban MTE | **Toàn quyền** liên quan MTE: điểm phụ cấp, điểm học tập, duyệt... |
| 7 | Ủy quyền tạm thời | **Cần ngay từ đầu** (ví dụ Leader vắng thì Phó nhóm thay) |

### Hệ quả cần đưa vào thiết kế

- **Xóa nhóm:** luồng xóa gồm hai bước: (1) chuyển thành viên sang nhóm đích, (2) xóa nhóm rỗng. Mọi thành viên luôn có đúng một nhóm tại một thời điểm.
- **Ủy quyền tạm thời:** người ủy quyền chọn **người nhận, phạm vi quyền, ngày bắt đầu và kết thúc**; quyền tự hết hiệu lực khi hết hạn; người nhận **chỉ có quyền trong phạm vi nhóm của người ủy quyền**; mọi hành động thực hiện thay phải ghi rõ **"làm thay cho ai"**.
- **Trưởng ban MTE toàn quyền:** vì quyền này rất rộng nên cần giữ **hai giới hạn an toàn**: (a) mọi thao tác sửa điểm, chốt kỳ đều **ghi nhật ký**; (b) Trưởng ban MTE là MTE nên **không được chấm hoặc duyệt bài của chính mình** hay điểm của chính mình; phần này do Admin toàn cục xử lý.
- **Quyền chốt kỳ:** ở mục 6.3 đề xuất tách riêng quyền chốt kỳ; theo quyết định số 6, Trưởng ban MTE có quyền chốt phần MTE, các phần khác vẫn thuộc người được chỉ định.
- **Gán module cho người cụ thể:** các tính toán tỷ lệ hoàn thành và thưởng chỉ tính trên những người **được gán** module.

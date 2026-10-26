# Yêu cầu cải thiện Web quản trị Mentoring, vòng 2 (ngôn ngữ nghiệp vụ)

> **Phạm vi:** Phần lớn logic hiện tại đã đúng nghiệp vụ. Tài liệu này chỉ liệt kê các **sai lệch cơ bản** cần sửa ở các dịch vụ: **Mentoring**, **Thư viện HLC**, **Điểm phụ cấp** và **HLC Fund**.
>
> **Thuật ngữ:** **MTE** = Mentee. **MTO** = Mentor. **Leader / Phó nhóm** = mentee giữ chức vụ quản lý nhóm.

---

## 1. Dịch vụ Mentoring

### 1.1. Recap của MTO chỉ cần duyệt, không chấm điểm

**Hiện trạng:** Bài recap của MTO đang đi theo quy trình chấm điểm.

**Yêu cầu nghiệp vụ:**
- Recap của **MTO** chỉ có hai kết quả: **Duyệt** hoặc **Không duyệt**, kèm lý do khi không duyệt.
- Không có thang điểm cho recap của MTO, và recap này **không tham gia** vào điểm số của MTO.
- Recap của **MTE** vẫn được chấm điểm như hiện tại.

### 1.2. Giới hạn quyền của Leader và Phó nhóm (MTE)

**Hiện trạng:** Leader và Phó nhóm đều là MTE, nhưng chưa có ranh giới rõ về việc họ được và không được xử lý bài nào.

**Yêu cầu nghiệp vụ:**
- Leader và Phó nhóm **không có quyền duyệt hay không duyệt** bài recap của MTO.
- Leader và Phó nhóm **chỉ có quyền chấm bài recap của MTE** thuộc nhóm mình.
- Việc duyệt recap MTO thuộc về **Admin** (Admin Mentoring hoặc Admin toàn cục).

**Lý do nghiệp vụ:** MTE không nên đánh giá người hướng dẫn mình, vì dễ xung đột lợi ích và ảnh hưởng đến tính khách quan.

### 1.3. Thống nhất barem chấm recap của Admin (hiện có 2 màn hình chấm)

**Hiện trạng:** Admin chấm recap ở **hai nơi**: một cửa sổ chấm bên **Mentoring**, một cửa sổ chấm bên **Quản lý theo nhóm**. Mỗi nơi dùng một barem riêng, nên cùng một bài có thể ra hai kết quả khác nhau.

**Yêu cầu nghiệp vụ:**
- Chỉ dùng **một barem duy nhất**, gồm **3 phần**, theo đúng barem của phần Quản lý theo nhóm.
- Hai màn hình chấm (Mentoring và Quản lý nhóm) phải **hiển thị cùng tiêu chí, cùng thang điểm**.
- Một bài recap chỉ có **một kết quả chấm duy nhất**. Dù chấm từ màn hình nào, điểm vẫn lưu về một chỗ, không sinh hai kết quả.
- Kết quả chấm vẫn là đầu vào để xếp hạng cặp **Nhất, Nhì, Ba** hằng tháng.

### 1.4. Điều kiện tính điểm phụ cấp mentoring cho MTE

**Yêu cầu nghiệp vụ:**
- Điểm phụ cấp mentoring của MTE **chỉ được tính sau khi recap đã được duyệt**. Recap chưa duyệt hoặc bị từ chối thì chưa có điểm.
- Khi recap được duyệt, hệ thống mới xác định:
  - Mốc thời gian để tính **thời điểm làm bài** của MTE.
  - MTE có nộp **trước hạn** hay không, từ đó xét **điểm thưởng nộp sớm** (tuần đầu 2 điểm, hai tuần đầu 1 điểm).
- Nếu recap bị không duyệt rồi nộp lại, mốc tính phải theo **lần nộp được duyệt**, và hệ thống ghi rõ cách xác định mốc này.

### 1.5. Nhập và xuất danh sách mentoring quý cũ, bổ sung recap hộ

**Mục đích:** Đưa dữ liệu các quý cũ (từ **năm 2023**) vào hệ thống, và hỗ trợ trường hợp MTE hoặc MTO không biết cách đăng bài.

**Yêu cầu nghiệp vụ:**
- **Xuất** danh sách mentoring của quý cũ ra file xlsx theo mẫu chuẩn.
- **Nhập** danh sách mentoring quý cũ và **bài recap của quý cũ** từ file xlsx đã chuẩn hóa, có bước kiểm tra và xem trước trước khi ghi.
- **Admin Mentoring** hoặc **Admin toàn cục** được **thêm recap hộ** cho MTE hoặc MTO khi một trong hai bên không đăng được bài.
- Dữ liệu thêm hộ phải ghi rõ: **ai nhập hộ, vào lúc nào, vì lý do gì**, để phân biệt với bài tự nộp.

**Rủi ro cần kiểm soát (dễ xung đột dữ liệu):**
- Chống **trùng lặp**: cùng một cặp, cùng một buổi, cùng một kỳ thì không tạo hai bản ghi.
- Dữ liệu quý cũ **không được làm thay đổi** điểm đã chốt của các tháng trước, trừ khi Admin chủ động yêu cầu tính lại.
- Có thể **hoàn tác một lần nhập** (thu hồi cả lô nếu phát hiện sai).
- Kiểm tra mã MTE, mã MTO, mã cặp có tồn tại và khớp với kỳ tương ứng.
- Nên nhập **thử với một lô nhỏ** và đối chiếu trước khi nhập toàn bộ.

---

## 2. Thư viện HLC

**Yêu cầu nghiệp vụ:**
- Thêm chức năng **xuất** danh sách sách ra file xlsx.
- Thêm chức năng **nhập** từ file xlsx để thêm hàng loạt sách, trong đó có **đường dẫn Google Drive** tới file PDF của sách.
- Hệ thống kiểm tra mẫu file, định dạng link, và **cảnh báo sách trùng**.
- Báo rõ dòng nào lỗi, dòng nào được thêm thành công.

---

## 3. Điểm phụ cấp cho Leader và Phó nhóm

**Hiện trạng:** Quyền Leader và Phó nhóm chưa được **gắn vào bộ tính điểm**, nên hệ thống chưa cộng điểm phụ cấp theo chức vụ.

**Quy tắc áp dụng toàn cục** (cho cả nhóm MTE lẫn nhóm HLC Fund):

| Chức vụ | Phụ cấp mặc định | Thưởng cuối tháng |
|---|---|---|
| **Leader** | **2 điểm** | **+1 điểm** nếu thành viên nhóm hoàn tất **trên 90%** |
| **Phó nhóm** | **1 điểm** | **+1 điểm** nếu thành viên nhóm hoàn tất **trên 90%** |

**Yêu cầu nghiệp vụ:**
- Điểm phụ cấp mặc định tính theo **chức vụ đang giữ trong tháng**.
- Chức vụ gắn với **từng nhóm cụ thể**. Một người giữ chức ở cả nhóm MTE và nhóm HLC Fund thì được tính theo từng nhóm.
- Cuối tháng, hệ thống tính **tỷ lệ hoàn tất của thành viên trong nhóm** và cộng thưởng nếu vượt **90%**.
- Điểm này hiển thị trong **bảng tổng hợp điểm** và **báo cáo PDF mùng 10**, kèm thông tin nguồn (chức vụ nào, nhóm nào).

**Cần chốt thêm:**
- "Hoàn tất" được hiểu là gì: hoàn thành đủ nhiệm vụ trong tháng, hay nộp đủ minh chứng quỹ (đối với nhóm HLC Fund)?
- Tỷ lệ 90% tính theo **số thành viên** đạt hay theo **tổng khối lượng công việc**?
- Chưa nêu rõ trường hợp **đổi chức vụ giữa tháng**, cần một quy tắc (ví dụ tính theo ngày nắm giữ lâu hơn hoặc tính theo ngày cuối tháng).
- Việc Leader hoặc Phó nhóm cộng dồn nhiều chức vụ cùng lúc có được không, hay có trần điểm.

---

## 4. Dịch vụ HLC Fund

### 4.1. Ghi nhận đóng góp của thầy cô ngoài danh sách MTO

**Hiện trạng:** Một số thầy cô tham gia đóng quỹ nhưng **không nằm trong danh sách MTO**, nên chưa có chỗ ghi nhận.

**Yêu cầu nghiệp vụ:**
- Cho phép **thêm tên thầy cô** vào danh sách đóng quỹ, không cần có hồ sơ MTO.
- Người được phép nhập minh chứng cho thầy cô: **Admin HLC Fund**, **Admin toàn cục**, hoặc **Leader nhóm HLC Fund** đó (là MTE).
- Mỗi lần nộp phải **khai báo**:
  - **Số tiền** (ví dụ 100.000đ).
  - **Chu kỳ và thời gian đóng** (ví dụ 100.000đ/tuần, đến ngày: ...).
  - Ảnh minh chứng.
- Hệ thống **lưu mốc ngày** của từng khoản để lập **dashboard thu chi quỹ theo tháng và theo quý**.

### 4.2. Vai trò của MTE là Leader nhóm HLC Fund

**Yêu cầu nghiệp vụ:**
- MTE chỉ **làm Leader** của nhóm HLC Fund, **không phải là thành viên** đóng quỹ trong nhóm đó.
- Quyền của Leader nhóm HLC Fund: **quan sát**, **duyệt** minh chứng, và **nộp minh chứng hộ** khi thành viên chưa tiện tự nộp.
- **Admin HLC Fund** và **Admin toàn cục** cũng được nộp hộ.
- Mọi lần nộp hộ phải ghi rõ **người nộp hộ** để phân biệt với thành viên tự nộp.

### 4.3. Tách nhóm HLC Fund của MTO khỏi nhóm của MTE

**Hiện trạng:** Logic hiện tại cho nhóm MTE đã đúng (vừa thuộc module học tập, vừa có HLC Fund riêng). Chỉ cần tách phần của MTO.

**Yêu cầu nghiệp vụ:**
- **Nhóm HLC Fund của MTO** là nhóm **riêng**, tách khỏi nhóm của MTE.
- Nhóm MTE giữ nguyên cách hoạt động hiện tại.
- **Thu chi quỹ vẫn tính chung**: báo cáo và dashboard tổng hợp tiền của cả hai loại nhóm về một sổ quỹ.
- Dashboard cho phép **lọc theo loại nhóm** (MTO, MTE, thầy cô ngoài danh sách), theo tháng, theo quý.

---

## 5. Bảng tổng hợp ưu tiên đề xuất

| Mức | Hạng mục | Lý do |
|---|---|---|
| **Cao** | Thống nhất barem chấm recap (1 barem, 3 phần, 1 kết quả) | Hai kết quả khác nhau làm sai điểm xếp hạng Nhất, Nhì, Ba |
| **Cao** | Recap MTO chỉ duyệt/không duyệt; chặn Leader/Phó nhóm duyệt recap MTO | Sửa sai phân quyền nghiệp vụ |
| **Cao** | Điều kiện tính điểm phụ cấp MTE chỉ sau khi recap được duyệt | Ảnh hưởng trực tiếp tiền phụ cấp |
| **Cao** | Phụ cấp Leader/Phó nhóm (2đ/1đ, thưởng +1đ trên 90%) | Cần xong trước kỳ chi mùng 10 |
| **Trung bình** | Tách nhóm HLC Fund của MTO; thầy cô ngoài danh sách; nộp hộ | Cần để dashboard thu chi đầy đủ |
| **Trung bình** | Nhập dữ liệu quý cũ từ 2023 và thêm recap hộ | Cần làm cẩn thận, có kiểm thử trước |
| **Thấp hơn** | Xuất/nhập xlsx thư viện HLC | Tiện ích, không ảnh hưởng tính điểm |

---

## 6. Câu hỏi cần chốt với nghiệp vụ

1. Thưởng 90% của Leader/Phó nhóm tính trên **tiêu chí hoàn tất** nào (xem mục 3)?
2. Khi recap của MTE bị không duyệt rồi nộp lại, **mốc tính nộp sớm** lấy theo lần nộp nào?
3. Recap nhập hộ cho quý cũ có được **tính điểm và xếp hạng** hồi tố hay chỉ lưu để tra cứu?
4. Thầy cô ngoài danh sách MTO có cần **hồ sơ tối thiểu** (họ tên, đơn vị, liên hệ) hay chỉ cần tên?
5. Khoản đóng định kỳ (ví dụ 100.000đ/tuần) có cần **tự tạo nhắc hạn** theo từng tuần không?

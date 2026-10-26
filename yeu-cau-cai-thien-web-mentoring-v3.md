# Yêu cầu cải thiện Web quản trị Mentoring, vòng 3 (ngôn ngữ nghiệp vụ)

> **Phạm vi:** Phần lớn logic hiện tại đã đúng nghiệp vụ. Tài liệu này chỉ liệt kê các **sai lệch cơ bản** ở ba nhóm chức năng: **Phân nhóm quản trị**, **Phụ cấp tháng** và **Mentoring**.
>
> **Thuật ngữ:** **MTE** = Mentee. **MTO** = Mentor. **Leader / Phó nhóm** = người giữ chức vụ quản lý nhóm.

---

## 1. Phân nhóm quản trị

### 1.1. Tách riêng nhóm HLC Fund của MTO và thầy cô ngoài HLC

**Hiện trạng:** Nhóm HLC Fund của MTO và nhóm của thầy cô ngoài HLC đang nằm **chung danh sách** với các nhóm MTE.

**Yêu cầu nghiệp vụ:**
- Quản lý **hai loại nhóm tách biệt**:
  - **Nhóm MTE** (liên quan module học tập và HLC Fund riêng của MTE).
  - **Nhóm HLC Fund của MTO và thầy cô ngoài HLC.**
- Hai loại nhóm có **danh sách riêng, màn hình quản lý riêng**, không lẫn thành viên và không lẫn báo cáo.
- Tiền thu chi quỹ vẫn **tổng hợp chung** ở cấp báo cáo, chỉ khác ở cấp quản lý nhóm.

### 1.2. MTE làm Leader nhóm HLC Fund của MTO và thầy cô: không phải thành viên

**Yêu cầu nghiệp vụ:**
- MTE giữ vai trò Leader của nhóm này **không được tính là thành viên** đóng quỹ trong nhóm.
- Quyền của Leader: **duyệt minh chứng** và **nộp hộ minh chứng** cho thành viên khi cần.
- Leader **không xuất hiện** trong danh sách thành viên và **không bị tính** vào tỷ lệ hoàn thành của nhóm.
- Mọi lần nộp hộ phải ghi rõ **người nộp hộ** để phân biệt với thành viên tự nộp.

### 1.3. Gộp "Phân quyền" và "Gán chức vụ" thành một, kèm tùy chọn điểm

**Hiện trạng:** Hai chức năng này đang làm gần như cùng một việc (xác định người đó là Leader, Phó nhóm...), nhưng tách thành hai nơi nên dễ lệch nhau.

**Yêu cầu nghiệp vụ:**
- Gộp thành **một chức năng duy nhất**: gán chức vụ cho ai thì người đó **đồng thời có quyền hạn tương ứng**.
- Với mỗi **vai trò (role)**, Admin cấu hình được:
  - **Quyền hạn** của vai trò đó (xem, duyệt, chấm, nộp hộ...).
  - **Điểm phụ cấp mặc định** cho vai trò (ví dụ Leader, Phó nhóm có mức điểm riêng).
  - **Điểm thưởng** khi **tỷ lệ thành viên trong nhóm hoàn thành vượt mức xx%**, trong đó **xx do Admin tự chọn** (không cố định 90%).
- Có thể **thêm vai trò mới** cùng cấu hình điểm mà không cần can thiệp lập trình.
- Mỗi chức vụ gắn với **một nhóm cụ thể** và có **thời gian hiệu lực**.

---

## 2. Phụ cấp tháng

### 2.1. Lỗi khi sửa đơn giá ở báo cáo tổng hợp điểm phụ cấp

**Hiện trạng:** Khi sửa **đơn giá** (số tiền quy đổi mỗi điểm) trong báo cáo tổng hợp điểm phụ cấp tháng, hệ thống báo lỗi **500 (yêu cầu không hợp lệ)** và không lưu được.

**Yêu cầu nghiệp vụ:**
- Admin sửa được đơn giá và hệ thống **lưu thành công**, tiền phụ cấp **tính lại ngay** theo đơn giá mới.
- Nếu dữ liệu nhập sai (âm, để trống, sai định dạng), hệ thống báo **thông báo rõ ràng** bằng ngôn ngữ dễ hiểu, không hiện lỗi kỹ thuật.
- Với bảng tổng hợp **đã chốt**, đơn giá **bị khóa**, chỉ mở khi có thao tác mở khóa có ghi nhật ký.
- Ghi lại **ai sửa, lúc nào, từ bao nhiêu thành bao nhiêu**.

### 2.2. Xuất file Excel bảng tổng hợp phụ cấp

**Hiện trạng:** Nút xuất Excel hiện **không hoạt động**.

**Yêu cầu nghiệp vụ:**
- Nút xuất Excel hoạt động và xuất **bảng biểu cơ bản** giống bảng đang xem trên màn hình (tên, các cột điểm, tổng điểm, đơn giá, thành tiền).
- **Không cần** thêm báo cáo, biểu đồ hay phần diễn giải trong file Excel.
- File phải **mở được trực tiếp** để đối chiếu và gửi bộ phận chi trả.
- Tên file thể hiện **tháng** của bảng tổng hợp.

### 2.3. Điểm cho Leader và điểm thưởng theo tỷ lệ hoàn thành

**Yêu cầu nghiệp vụ:**
- Điểm phụ cấp của **mọi Leader** (và các chức vụ khác) lấy từ **cấu hình của vai trò** ở mục 1.3, không nhập tay riêng từng người.
- Cuối tháng, hệ thống tính **tỷ lệ thành viên trong nhóm hoàn thành**. Nếu **vượt mức xx% do Admin chọn** thì cộng **điểm thưởng** theo cấu hình.
- Bảng tổng hợp ghi rõ nguồn của từng khoản: **phụ cấp chức vụ** hay **thưởng đạt tỷ lệ**, thuộc nhóm nào.
- Không tính Leader và Phó nhóm vào mẫu số tỷ lệ hoàn thành của chính nhóm họ quản lý, riêng nhóm HLC Fund của MTO, vì họ không phải thành viên.

### 2.4. Hai bảng tổng hợp cùng tồn tại từ ngày 1 đến ngày 10 hằng tháng

**Hiện trạng:** Ngày chi trả là **mùng 10**. Vì vậy từ ngày 1 đến ngày 10, hệ thống có **hai bảng cùng lúc**: bảng **tháng cũ** (đang chờ chi) và bảng **tháng mới** (đang tích lũy điểm). Nguy cơ là hai bảng lẫn dữ liệu hoặc ghi đè điểm của nhau.

**Yêu cầu nghiệp vụ:**
- Mỗi bảng tổng hợp có **mã riêng, tự sinh theo tháng** (ví dụ gắn với kỳ tháng), để tách bạch hoàn toàn.
- Mỗi bản ghi điểm gắn với **đúng một kỳ tháng**. Điểm phát sinh sau ngày cuối tháng đi vào bảng tháng mới, không đi vào bảng tháng cũ.
- Bảng tháng cũ có **trạng thái** rõ ràng: *Đang chờ chi / Đã chi*, và **khóa chỉnh sửa** sau khi chốt.
- Hệ thống **tự tạo bảng của tháng mới** khi sang tháng, không cần Admin tạo tay.
- Có thể xem và xuất **từng bảng độc lập** mà không ảnh hưởng bảng còn lại.
- Chỉnh sửa ở bảng tháng cũ (nếu được phép sau khi mở khóa) phải ghi nhật ký và **không làm thay đổi** điểm của tháng mới.

---

## 3. Dịch vụ Mentoring

### 3.1. Ghép cặp và xóa cặp tự lan sang các tháng còn lại của quý

**Yêu cầu nghiệp vụ:**
- Khi Admin **ghép cặp** MTE và MTO ở **tháng x**, hệ thống **tự sinh cặp** cho các tháng **sau tháng x trong cùng quý**.
- Khi Admin **xóa cặp** ở tháng x, hệ thống **tự xóa** cặp đó ở các tháng sau trong cùng quý.
- Phạm vi chỉ gồm **các tháng sau trong cùng quý**, không lan sang quý khác và **không tạo ngược** về các tháng trước.

**Ví dụ minh họa:**

| Thao tác của Admin | Kết quả |
|---|---|
| Ghép cặp ở **tháng 10** | Có cặp ở tháng 10, tự sinh **tháng 11 và tháng 12** |
| Ghép cặp ở **tháng 11** | Có cặp ở tháng 11, tự sinh **tháng 12**; **tháng 10 không có** |
| Ghép cặp ở **tháng 12** | Chỉ có tháng 12 |
| Xóa cặp ở **tháng 10** | Xóa tháng 10, tự xóa **tháng 11 và tháng 12** |
| Xóa cặp ở **tháng 11** | Xóa tháng 11, tự xóa **tháng 12**; tháng 10 **giữ nguyên** |

**Điểm cần kiểm soát:**
- Khi xóa cặp, hệ thống **xóa sạch toàn bộ dữ liệu liên quan đến cặp đó** ở các tháng sau trong quý (lịch, recap, điểm chấm, điểm phụ cấp phát sinh từ cặp). Vì là thao tác không thể hoàn tác, hệ thống phải hiển thị **màn hình xác nhận nêu rõ số lượng dữ liệu sẽ bị xóa** trước khi thực hiện.
- Nếu tháng sau đã **chốt bảng phụ cấp** thì không được tự thêm hoặc xóa cặp ở tháng đó.
- Khi cặp tự sinh bị trùng với một cặp đã ghép tay ở tháng sau, hệ thống **không tạo trùng** và báo rõ.
- Ghi nhật ký: **ai ghép, ai xóa, tháng nào, các tháng nào bị tác động**.

---

## 4. Bảng tổng hợp ưu tiên đề xuất

| Mức | Hạng mục | Lý do |
|---|---|---|
| **Cao** | Lỗi 500 khi sửa đơn giá | Chặn việc tính phụ cấp |
| **Cao** | Tự sinh mã bảng tổng hợp theo tháng (tránh xung đột ngày 1 đến 10) | Rủi ro sai tiền chi trả |
| **Cao** | Gộp phân quyền và chức vụ, cấu hình điểm theo role và ngưỡng xx% | Nền tảng cho điểm Leader, Phó nhóm |
| **Trung bình** | Tách nhóm HLC Fund của MTO và thầy cô khỏi nhóm MTE | Cần để quản lý và dashboard rõ ràng |
| **Trung bình** | Ghép và xóa cặp tự lan trong quý | Giảm thao tác tay, cần kiểm soát dữ liệu phát sinh |
| **Trung bình** | Nút xuất Excel bảng tổng hợp (bảng cơ bản) | Cần đối chiếu và gửi chi trả |

---

## 5. Các quyết định đã chốt

| # | Nội dung | Quyết định |
|---|---|---|
| 1 | Ngưỡng % thưởng khi thành viên hoàn thành | **Mỗi loại nhóm có một ngưỡng riêng** (nhóm MTE một ngưỡng, nhóm HLC Fund của MTO và thầy cô một ngưỡng), do Admin cấu hình |
| 2 | Xóa cặp khi các tháng sau đã có lịch hoặc recap | **Xóa sạch** toàn bộ dữ liệu liên quan đến cặp đó |
| 3 | Đơn giá điểm | **Có thể khác nhau theo từng tháng**. Sau khi đã chi trả, nếu phát hiện sai thì có **cơ chế bù sang tháng sau** |
| 4 | Mã bảng tổng hợp | **Theo quy ước đọc được**, gồm năm và tháng |
| 5 | Vai trò mới thêm sau này | **Giới hạn theo từng loại nhóm** (vai trò thuộc nhóm MTE không dùng cho nhóm HLC Fund và ngược lại) |

### Hệ quả cần đưa vào thiết kế

- **Ngưỡng theo loại nhóm:** cấu hình ngưỡng % nằm ở cấp *loại nhóm*, không nằm ở cấp vai trò. Khi tính thưởng cho Leader hoặc Phó nhóm, hệ thống lấy ngưỡng của loại nhóm mà người đó quản lý.
- **Xóa sạch dữ liệu cặp:** thao tác này **phải có xác nhận** và **ghi nhật ký** (ai xóa, cặp nào, tháng nào, bao nhiêu bản ghi). Nếu tháng đó đã **chốt bảng phụ cấp hoặc đã chi trả** thì hệ thống **không xóa tự động** phần của tháng đó, vì xóa sẽ làm lệch bảng đã chi; trường hợp này xử lý bằng cơ chế bù ở dưới.
- **Đơn giá theo tháng:** đơn giá lưu **theo từng kỳ tháng**, đổi đơn giá tháng này **không làm đổi** tiền của tháng đã chốt.
- **Cơ chế bù:** bảng của tháng đã chi **không sửa trực tiếp**. Khoản chênh lệch được ghi thành một **dòng điều chỉnh** ở bảng tháng kế tiếp, có ghi rõ lý do, tháng gốc bị sai và người duyệt.
- **Mã bảng tổng hợp:** dạng như `PC-2026-10` (phụ cấp, năm, tháng), tự sinh, duy nhất cho mỗi kỳ, dùng cho cả màn hình, file Excel và PDF.
- **Vai trò theo loại nhóm:** khi tạo vai trò mới, Admin bắt buộc chọn loại nhóm áp dụng.

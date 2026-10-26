# Yêu cầu cải thiện Web quản trị Mentoring, vòng 6 (ngôn ngữ nghiệp vụ)

> **Phạm vi:** Phần lớn logic hiện tại đã đúng nghiệp vụ. Tài liệu này tập trung vào **phân chia quản trị theo module**, **quyền với recap**, **dashboard điểm học tập trung bình** và **tạo module học tập mới**.
>
> **Thuật ngữ:** **MTE** = Mentee. **MTO** = Mentor. **Admin toàn cục** = quản trị cao nhất. Từ vòng này **không còn chức năng "quyền module" riêng**: quản trị được chia **theo tên chức vụ**.

---

## 1. Các chức vụ quản trị (chia theo tên chức vụ)

Bỏ chức năng **quyền module** tách riêng. Mỗi chức vụ có sẵn bộ quyền của mình, gán chức vụ cho ai thì người đó có quyền tương ứng.

| Chức vụ | Quyền | Giới hạn và ghi chú |
|---|---|---|
| **Admin toàn cục** | Toàn bộ hệ thống, mọi dashboard | Không giới hạn |
| **Trưởng ban Mentoring** | **Tất cả dịch vụ mentoring**: ghép cặp, đổi cặp, lịch, recap (duyệt, nộp hộ, ủy quyền), chấm, nhập dữ liệu quý cũ; xem dashboard mentoring | Không có quyền ở các mảng không liên quan mentoring |
| **Trưởng ban HLC Fund** | **Tất cả dịch vụ HLC Fund và mọi nội dung liên quan đến tiền**: duyệt minh chứng, duyệt điểm phụ cấp, sửa đơn giá, dòng điều chỉnh bù, **chốt kỳ phụ cấp**, **xác nhận đã chi**; xem dashboard thu chi đầy đủ | Không có quyền ở các mảng không liên quan tiền |
| **Trưởng ban Học tập** (admin module học tập lớn) | **Toàn bộ module học tập**: tạo module học tập mới, xem tiến độ mọi module, toàn quyền với các module học tập; xem dashboard **điểm học tập trung bình** | **Không bao gồm mentoring**: với mentoring chỉ được **xem**, không duyệt, không sửa, không nộp hộ. Điều chỉnh phần mentoring thì **bình luận đề xuất** |
| **Admin module học tập nhỏ** (đặt tên theo module, ví dụ **Admin module Đọc sách**) | Quản lý **riêng một module học tập** (được gán khi tạo module mới) và xem tiến độ module đó | Không thấy và không sửa module khác |
| **Trưởng ban MTE** | **Quản lý toàn bộ nhóm MTE và các hoạt động có MTE**; vẫn có quyền **duyệt, nộp hộ**... trong phạm vi MTE | **Sửa điểm phụ cấp** phải **đề xuất** Trưởng ban HLC Fund; **đổi cặp** cho MTE phải **đề xuất** Trưởng ban Mentoring (và các thay đổi tương tự thuộc mảng khác) |
| **Trưởng nhóm / Phó nhóm** (nhóm MTE) | **Xem tiến độ thành viên**, **duyệt / không duyệt** và **chấm điểm** từng bài nộp của thành viên nhóm mình | Chỉ trong nhóm của mình; recap MTO chỉ **xem**, duyệt hộ khi được ủy quyền |
| **Trưởng nhóm / Phó nhóm HLC Fund** | **Duyệt / không duyệt / nộp hộ** minh chứng cho **thầy cô và MTO** trong nhóm; **xem tiến độ** | **Không phải thành viên nhóm**; chỉ xem tiến độ và duyệt, không có quyền khác |

**Vì sao Trưởng ban Học tập chỉ được xem mentoring:** điểm mentoring (recap) góp vào **điểm học tập trung bình**, nên cần xem để hiểu số liệu, nhưng phần mentoring thuộc **Trưởng ban Mentoring** để tránh hai nơi cùng sửa một dữ liệu.

**Nguyên tắc chung về "đề xuất":** khi một chức vụ không có quyền sửa, họ **gửi đề xuất** (có lý do) cho chức vụ nắm quyền đó; người nắm quyền **duyệt hoặc từ chối**, và mọi đề xuất lưu lịch sử.

---

## 2. HLC Fund: Trưởng ban HLC Fund duyệt đầy đủ và xem dashboard

**Hiện trạng:** Chưa có chức vụ nào duyệt đầy đủ HLC Fund và xem được dashboard HLC Fund.

**Yêu cầu nghiệp vụ:** **Trưởng ban HLC Fund** (chức vụ có quyền ở mục 1) được:
- **Duyệt đầy đủ** minh chứng nộp quỹ của mọi nhóm (nhóm MTE, nhóm MTO, thầy cô ngoài danh sách), gồm cả nộp hộ.
- **Xem dashboard HLC Fund đầy đủ**: thu chi theo tháng, theo quý, theo loại nhóm, trạng thái duyệt.
- Có **toàn quyền thu chi**: **duyệt điểm phụ cấp** (mục 4.1), **sửa đơn giá**, tạo **dòng điều chỉnh bù**, **chốt kỳ phụ cấp** và **xác nhận đã chi** (cùng Admin toàn cục).
- Chức vụ này **không tự động** có quyền ở mentoring hay học tập.
- **Chuyển hẳn** quyền chốt kỳ và sửa điểm phụ cấp từ Trưởng ban MTE sang Trưởng ban HLC Fund; Trưởng ban MTE chỉ **bình luận đề xuất, chờ duyệt**.
- Khác với Trưởng nhóm HLC Fund (chỉ duyệt trong nhóm của mình), Trưởng ban HLC Fund có **phạm vi toàn bộ HLC Fund**.

---

## 3. Recap mentoring: quyền xem, duyệt và nộp hộ

### 3.1. Recap của MTO

**Quyền mặc định:** chỉ **Trưởng ban Mentoring** và **Admin toàn cục** được **duyệt (hoặc không duyệt)** và **nộp hộ** recap của MTO.

**Quyền xem:** **MTE trong cặp** và **Leader nhóm** của MTE đó **xem được recap MTO mặc định**, không cần ủy quyền.

**Quyền theo ủy quyền:** ba nhóm sau **chỉ được duyệt hộ hoặc nộp hộ khi được Trưởng ban Mentoring ủy quyền**:

| Người | Điều kiện |
|---|---|
| **MTE trong cặp** | MTE được ghép cặp với MTO đó, và được Trưởng ban Mentoring ủy quyền |
| **MTE quản lý nhóm** | Leader (MTE) của **nhóm chứa MTE đang cặp** với MTO đó, và được Trưởng ban Mentoring ủy quyền |
| **Trưởng ban MTE** | Duyệt recap MTO cũng **cần được Trưởng ban Mentoring ủy quyền**, như Leader nhóm |

- Ủy quyền do **Trưởng ban Mentoring** cấp, có **phạm vi** (recap của cặp hoặc nhóm nào), **thời hạn** và **lý do**; hết hạn thì tự mất hiệu lực.
- Mọi hành động làm thay ghi rõ **"làm thay cho ai, theo ủy quyền của ai"**.
- Khi không có ủy quyền, MTE cặp và Leader nhóm **không duyệt, không nộp hộ** recap MTO, đúng với quy định vòng 2.

### 3.2. Recap của MTE

- **MTE tự nộp** recap của mình.
- **Nộp hộ** chỉ do **Admin toàn cục** hoặc **Trưởng ban Mentoring** thực hiện.
- Việc **chấm điểm** recap MTE vẫn theo quy định đã chốt (barem thống nhất, Leader nhóm chấm thang 100).

### 3.3. Yêu cầu chung

- Mọi lần **nộp hộ** ghi rõ **người nộp hộ, thời điểm, lý do**, để phân biệt với bài tự nộp.
- Mọi lần **duyệt hoặc không duyệt** ghi nhật ký (ai duyệt, kết quả, lý do khi không duyệt).

### 3.4. Quan hệ với quy định đã chốt trước đó

Quy định vòng 2 (**Leader, Phó nhóm không duyệt recap MTO**) **vẫn là mặc định**. Yêu cầu lần này chỉ thêm **ngoại lệ có kiểm soát**: khi Trưởng ban Mentoring chủ động ủy quyền thì MTE cặp hoặc Leader nhóm mới duyệt hộ, nộp hộ được.

---

## 4. Dashboard điểm học tập trung bình

**Hiện trạng:** Giao diện chưa hiển thị dashboard **điểm học tập trung bình**, cả với Trưởng ban Học tập lẫn Admin toàn cục.

**Yêu cầu nghiệp vụ:**
- Hiển thị dashboard **điểm học tập trung bình** cho **Trưởng ban Học tập** và **Admin toàn cục**.
- Điểm trung bình tính từ **điểm các module học tập** và **điểm recap mentoring**; điểm mentoring **lấy trực tiếp từ dữ liệu mentoring**, không sao chép sang chỗ khác.
- Có thể xem **theo từng MTE, theo nhóm, theo module, theo tháng và theo quý**.
- Nêu bật **người điểm cao**, **người cần cải thiện**, và so sánh giữa các nhóm.
- **Trưởng ban Học tập** xem được phần điểm mentoring trong dashboard này nhưng **không sửa, không duyệt** (theo mục 1). Khi thấy phần mentoring cần điều chỉnh, Trưởng ban Học tập **bình luận đề xuất** ngay trên dữ liệu đó; **Trưởng ban Mentoring xem và duyệt** đề xuất. Mọi đề xuất và kết quả duyệt được lưu lịch sử.
- **Admin module học tập nhỏ** chỉ xem **dashboard của module mình quản lý**, không xem điểm trung bình toàn bộ.

### 4.1. Điểm phụ cấp và thưởng có phần gốc từ mentoring

- **Trưởng ban Mentoring chỉ được đề xuất** điểm phụ cấp và điểm thưởng liên quan mentoring (mentoring sớm, cặp nhất nhì ba...), **không tự đưa vào bảng phụ cấp**.
- **Trưởng ban HLC Fund (trưởng ban HLC Fund) xem và duyệt** các đề xuất này; chỉ điểm đã duyệt mới vào bảng tổng hợp phụ cấp.
- Mỗi đề xuất ghi **người đề xuất, lý do, người duyệt, kết quả** và liên kết về dữ liệu mentoring gốc, để không lặp dữ liệu.

---

## 5. Tạo module học tập mới: gán đối tượng và chia sẻ quyền quản trị

**Yêu cầu nghiệp vụ:**
- Khi tạo module học tập mới, người có quyền (Admin toàn cục, Trưởng ban Học tập) chọn **đối tượng áp dụng**:
  - **Một số MTE riêng lẻ**, hoặc
  - **Cả MTO riêng lẻ lẫn MTE riêng lẻ** trong cùng một module.
- Người không được gán **hoàn toàn không thấy** module (theo quy định đã chốt), và không bị tính thiếu bài khi tính tỷ lệ hoàn thành, điểm trung bình.
- Có thể **thêm hoặc bớt người** được gán sau khi module đã mở; bài đã nộp trước đó **được giữ nguyên**.
- Khi tạo module, có thể **chỉ định người giữ chức admin module học tập nhỏ** của module đó (tên chức vụ theo module, ví dụ Admin module Đọc sách). Người này chỉ quản lý module đó.
- Mỗi thay đổi về đối tượng và người quản trị được **ghi nhật ký**.
- Tạo module mới **không cần sửa hệ thống**, đúng nguyên tắc module cấu hình được đã đề ra từ đầu.

---

## 6. Bảng tổng hợp ưu tiên đề xuất

| Mức | Hạng mục | Lý do |
|---|---|---|
| **Cao** | Phân quyền theo tên chức vụ (bỏ quyền module riêng) | Nền tảng để giao việc cho nhiều người quản trị |
| **Cao** | Trưởng ban HLC Fund: duyệt đầy đủ, dashboard, chốt kỳ, sửa điểm phụ cấp | Đang thiếu, ảnh hưởng thu chi quỹ |
| **Cao** | Cơ chế đề xuất giữa các chức vụ (Trưởng ban MTE, Học tập, Mentoring đề xuất cho chức vụ nắm quyền) | Thay cho việc sửa trực tiếp ngoài quyền |
| **Cao** | Quyền xem, duyệt, nộp hộ recap MTO / nộp hộ recap MTE | Ảnh hưởng điểm mentoring và phụ cấp |
| **Trung bình** | Dashboard điểm học tập trung bình | Cần cho báo cáo chất lượng và xếp hạng |
| **Trung bình** | Gán module cho MTE, MTO riêng lẻ; chỉ định admin module học tập nhỏ | Mở rộng module học tập |

---

## 7. Các quyết định đã chốt

| # | Nội dung | Quyết định |
|---|---|---|
| 1 | Duyệt, nộp hộ recap MTO của MTE cặp và Leader nhóm | **Chỉ khi Trưởng ban Mentoring ủy quyền** (mặc định vẫn không được, giữ quy định vòng 2) |
| 2 | Ai được nộp hộ recap MTO | **Chỉ Trưởng ban Mentoring và Admin toàn cục**; các role khác chỉ khi được ủy quyền |
| 3 | Admin module HLC Fund và trưởng ban HLC Fund | **Gộp làm một**, có toàn quyền thu chi (gồm chốt kỳ, xác nhận đã chi) |
| 4 | Điểm phụ cấp có phần gốc mentoring | **Trưởng ban HLC Fund xem và duyệt**; **Trưởng ban Mentoring chỉ đề xuất** |
| 5 | Điều chỉnh phần mentoring trong điểm học tập trung bình | **Trưởng ban Học tập bình luận đề xuất**, **Trưởng ban Mentoring duyệt** |
| 6 | Bảng quyền theo chức vụ (vòng 4) và Admin module (vòng 6) | **Gộp làm một**; từ dòng 10 chỉ còn phân quyền theo tên chức vụ |
| 7 | Xem recap MTO của MTE cặp và Leader nhóm | **Xem mặc định**, chỉ duyệt hộ và nộp hộ mới cần ủy quyền |
| 8 | Trưởng ban MTE | **Vai trò riêng** phụ trách các nhóm MTE (xem thêm dòng 11) |
| 9 | Sửa đơn giá và dòng điều chỉnh bù | **Thuộc quyền Trưởng ban HLC Fund** (toàn quyền thu chi) |
| 10 | Chức năng "quyền module" riêng | **Bỏ**; chia quản trị **theo tên chức vụ** (xem mục 1) |
| 11 | Quyền chốt kỳ và sửa điểm phụ cấp của Trưởng ban MTE | **Chuyển hẳn sang Trưởng ban HLC Fund**; Trưởng ban MTE chỉ **bình luận đề xuất, chờ duyệt**. Đổi cặp cho MTE cũng phải đề xuất Trưởng ban Mentoring |
| 12 | Trưởng ban MTE duyệt recap MTO | **Cần ủy quyền** từ Trưởng ban Mentoring, như Leader nhóm |
| 13 | Minh chứng HLC Fund của nhóm MTE | **Trưởng nhóm / Phó nhóm MTE** duyệt; nhóm MTE và nhóm HLC Fund (thầy cô, MTO) là **hai nhóm tách biệt** |

### Hệ quả cần đưa vào thiết kế

- **Ủy quyền duyệt hộ:** dùng cùng cơ chế **ủy quyền có thời hạn** đã chốt ở vòng 4, nhưng người cấp ủy quyền ở đây là **Trưởng ban Mentoring**, và phạm vi giới hạn theo cặp hoặc nhóm.
- **Hai bước cho điểm phụ cấp từ mentoring:** đề xuất (Trưởng ban Mentoring) rồi duyệt (Trưởng ban HLC Fund), có lịch sử đầy đủ.
- **Bình luận đề xuất trên dashboard điểm học tập:** cần một chỗ ghi nhận đề xuất gắn với dữ liệu cụ thể, có trạng thái *chờ duyệt, đã duyệt, từ chối*.
- **Phân quyền theo chức vụ:** mỗi chức vụ có bộ quyền cố định, không còn màn hình cấu hình "quyền module" riêng. Việc tạo thêm chức vụ admin module học tập nhỏ đi cùng việc tạo module học tập mới.
- **Cơ chế đề xuất:** Trưởng ban MTE đề xuất cho Trưởng ban HLC Fund (điểm phụ cấp) và Trưởng ban Mentoring (đổi cặp); Trưởng ban Học tập đề xuất cho Trưởng ban Mentoring (phần mentoring); Trưởng ban Mentoring đề xuất cho Trưởng ban HLC Fund (điểm phụ cấp từ mentoring). Cần một nơi chung ghi đề xuất với trạng thái *chờ duyệt, đã duyệt, từ chối*, người đề xuất, người duyệt và lý do.
- **Thu hẹp quyền Trưởng ban MTE so với vòng 4:** vòng 4 chốt Trưởng ban MTE toàn quyền liên quan MTE, kể cả chốt kỳ và sửa điểm phụ cấp. Từ nay chốt kỳ và sửa điểm phụ cấp **chỉ thuộc Trưởng ban HLC Fund**; các hoạt động còn lại của nhóm MTE (duyệt, nộp hộ, quản lý nhóm) giữ như đã chốt.

## 8. Còn cần chốt

Không còn câu hỏi mở cho phần này.

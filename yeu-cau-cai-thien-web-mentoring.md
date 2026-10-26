# Yêu cầu cải thiện Web quản trị Mentoring (ngôn ngữ nghiệp vụ)

> Tài liệu này diễn đạt lại các điểm cần cải thiện của hệ thống dưới dạng **nhu cầu nghiệp vụ**: ai làm gì, vì sao cần, và hệ thống phải đáp ứng điều kiện nào thì được xem là đạt.

---

## 1. Phân quyền và tổ chức nhóm

### 1.1. Phân quyền theo vai trò (Leader chưa có quyền hạn riêng)

**Hiện trạng:** Admin đã gán một mentee làm Leader, nhưng khi Leader đăng nhập, hệ thống vẫn hiển thị và cho phép thao tác giống hệt mentee thường. Việc phân quyền mới dừng ở mức *gán nhãn*, chưa có tác dụng thực tế.

**Yêu cầu nghiệp vụ:**
- Vai trò chức vụ (Leader, Phó nhóm) phải **kéo theo quyền hạn thực tế** trong hệ thống.
- Leader được xem, kiểm tra và đánh giá hoạt động của **các thành viên thuộc nhóm mình**, không xem được nhóm khác.
- Quyền của Leader tối thiểu gồm: xem tiến độ nhóm, chấm điểm bài recap thang 100, duyệt minh chứng HLC Fund của nhóm.
- Phó nhóm hỗ trợ hoặc thay Leader khi vắng mặt, theo phạm vi quyền do Admin cấu hình.

**Tiêu chí hoàn thành:** Đăng nhập bằng tài khoản Leader thì thấy menu, dữ liệu và chức năng khác với mentee thường; đăng nhập bằng mentee thường thì không truy cập được chức năng của Leader.

### 1.2. Chia mentee thành các nhóm, mỗi nhóm có Leader và Phó nhóm

**Yêu cầu nghiệp vụ:**
- Admin có thể **chia mentee thành các nhóm**, mỗi nhóm có đúng 1 Leader và 1 Phó nhóm.
- Mỗi mentee thuộc một nhóm tại một thời điểm; lịch sử chuyển nhóm được lưu lại.
- Mọi quy trình liên quan (chấm bài, duyệt quỹ, báo cáo) đều **đi theo cấu trúc nhóm** này.
- Việc thay Leader hoặc Phó nhóm không làm mất dữ liệu cũ của nhóm.

### 1.3. Chỉnh sửa thông tin cá nhân cơ bản

**Yêu cầu nghiệp vụ:** Mentee và Mentor tự cập nhật hồ sơ cá nhân, gồm:
- Ngày tháng năm sinh
- Địa chỉ hiện tại
- Quê quán
- Số tài khoản ngân hàng (phục vụ chi trả phụ cấp)
- Các thông tin cơ bản khác khi cần

**Lưu ý nghiệp vụ:**
- Thông tin ngân hàng ảnh hưởng đến việc chi tiền nên cần có **lịch sử thay đổi** (ai sửa, lúc nào) để đối soát.
- Chỉ chính chủ và Admin được xem, sửa dữ liệu nhạy cảm như số tài khoản.

---

## 2. HLC Fund (Quỹ)

**Hiện trạng đã làm rõ:** Có khoảng 12 đến 13 nhóm mentor tham gia. Mỗi nhóm có một mentee làm Leader phụ trách duyệt.

**Yêu cầu nghiệp vụ:**
- Mỗi tuần, **mentor** gửi ảnh minh chứng đóng quỹ lên hệ thống.
- Hệ thống tự **tổng hợp báo cáo theo từng nhóm** và chuyển đến **đúng Leader của nhóm chứa mentor đó**.
- Leader duyệt minh chứng của nhóm mình với các trạng thái: **Chờ / Đã xong / Chưa xong**.
- Admin xem được toàn bộ để đối soát, nhưng quy trình duyệt cơ bản do Leader thực hiện.

**Điểm khác so với thiết kế ban đầu:** Đối tượng nộp minh chứng là **mentor** (theo tuần), và người duyệt là **Leader nhóm**, thay vì chỉ Admin duyệt hằng ngày.

---

## 3. Mentoring: chỉnh sửa và hoàn thiện

### 3.1. Vai trò Admin: xuất và nhập dữ liệu lịch qua Excel

**Mục đích:** Giảm lỗi khi nhập dữ liệu hàng loạt, tránh việc nhập nhầm file hoặc file sai định dạng làm hỏng dữ liệu hệ thống.

**Yêu cầu nghiệp vụ:**
- Có chức năng **Xuất lịch mentoring ra file .xlsx** theo mẫu chuẩn của hệ thống.
- Admin chỉnh sửa **trực tiếp trên file đã xuất**, sau đó nhập lại lên hệ thống.
- Hệ thống chỉ chấp nhận file **đúng mẫu** (kiểm tra cột, định dạng, mã cặp, ngày giờ), và báo rõ dòng nào lỗi.
- Nếu file không hợp lệ, hệ thống **từ chối toàn bộ hoặc báo lỗi từng dòng**, không làm thay đổi dữ liệu hiện có.

### 3.2. Ghi đè lịch mentoring: đồng bộ logic liên quan

**Hiện trạng:** Admin có thể ghi đè lịch, nhưng các dữ kiện đi kèm lịch cũ (đặc biệt **mốc tính trạng thái bài recap**) không chuyển sang lịch mới. Kết quả là lịch đã đổi nhưng trạng thái recap vẫn tính theo lịch cũ.

**Yêu cầu nghiệp vụ:**
- Khi lịch bị ghi đè, mọi **mốc thời gian và trạng thái phụ thuộc** (hạn nộp recap, trạng thái đúng hạn/trễ hạn, mốc tính "mentoring sớm") phải **tự động tính lại theo lịch mới**.
- Bài recap đã nộp trước đó vẫn được giữ và gắn đúng với buổi mentoring tương ứng.

### 3.3. Ghi nhận lịch sử ghi đè (kiểm soát quyền lực tập trung)

**Mục đích:** Tránh trường hợp một người sửa lịch "cửa sau" cho riêng Leader hoặc cho một cặp nào đó mà không ai biết.

**Yêu cầu nghiệp vụ:**
- Mỗi lần ghi đè lịch, hệ thống **bắt buộc ghi lý do/ghi chú**.
- Hệ thống lưu **nhật ký thay đổi**: ai sửa, thời điểm, lịch cũ, lịch mới, lý do.
- Nhật ký này **không thể xóa hoặc sửa** bởi người đã thực hiện thay đổi, và có thể được kiểm tra khi cần đối soát điểm thưởng.

---

## 4. Recap: hiển thị đúng kỳ và chấm điểm

### 4.1. Danh sách lịch sắp tới hiển thị sai kỳ

**Hiện trạng:** Khi mô phỏng sang **quý 1/2027**, màn hình mentee và mentor vẫn hiển thị lịch của **quý 4/2026** trong danh sách "lịch sắp tới".

**Yêu cầu nghiệp vụ:**
- "Lịch sắp tới" chỉ gồm các buổi **từ thời điểm hiện tại trở đi** và thuộc kỳ đang hoạt động.
- Lịch của kỳ đã kết thúc chuyển sang mục **lịch sử/đã qua**, không lẫn vào danh sách sắp tới.
- Việc chuyển kỳ phải không làm sai trạng thái các recap còn dang dở của kỳ trước.

### 4.2. Liên kết recap mentoring với module học tập để Leader chấm điểm

**Mục đích:** Recap 1on1 không chỉ là tài liệu lưu trữ mà còn là **căn cứ đánh giá chất lượng** và xếp hạng cặp mentoring hằng tháng.

**Yêu cầu nghiệp vụ:**
- Mỗi bài recap mentoring 1on1 được **ánh xạ (liên kết) sang module học tập**, để dùng chung cơ chế nộp bài, duyệt và chấm điểm.
- **Leader của nhóm tương ứng** chấm bài recap theo **thang điểm 100**.
- Điểm này là **một thành phần trong barem** xếp hạng cặp **Nhất, Nhì, Ba** hàng tháng, từ đó quyết định điểm thưởng 5, 3, 2 của cặp.
- Dữ liệu chỉ lưu **một nơi** (bài recap gốc), điểm số gắn vào bài đó, không sao chép sang bảng khác.

---

## 5. Tổng hợp mức độ ưu tiên đề xuất

| Mức | Hạng mục | Lý do |
|---|---|---|
| **Cao** | Phân quyền Leader thực tế; chia nhóm (Leader, Phó nhóm) | Là nền tảng để duyệt quỹ, chấm recap, báo cáo theo nhóm |
| **Cao** | Đồng bộ logic khi ghi đè lịch; nhật ký ghi đè | Ảnh hưởng trực tiếp đến tính điểm thưởng và tính minh bạch |
| **Cao** | Ánh xạ recap sang module học tập, chấm thang 100 | Là đầu vào của barem xếp Nhất, Nhì, Ba |
| **Trung bình** | Sửa lỗi lịch sắp tới lẫn kỳ cũ | Gây nhầm lẫn khi chuyển quý |
| **Trung bình** | HLC Fund theo nhóm mentor, Leader duyệt | Cần xong trước khi vận hành quỹ theo tuần |
| **Trung bình** | Xuất và nhập xlsx cho lịch mentoring | Giảm lỗi nhập liệu của Admin |
| **Thấp hơn** | Chỉnh sửa thông tin cá nhân (kèm lịch sử thông tin ngân hàng) | Cần trước kỳ chi phụ cấp |

---

## 6. Câu hỏi cần chốt với nghiệp vụ

1. Leader có được xem điểm và thông tin cá nhân của thành viên trong nhóm không, hay chỉ xem tiến độ?
2. Phó nhóm có quyền chấm điểm và duyệt độc lập hay chỉ thay Leader khi vắng?
3. Leader có được chấm recap của **chính cặp mình tham gia** không? (cần quy tắc tránh xung đột lợi ích)
4. Nhóm HLC Fund có trùng với nhóm mentee Leader/Phó nhóm không, hay là phân nhóm riêng theo mentor?
5. Khi ghi đè lịch, cần Admin khác hoặc cấp trên **phê duyệt** hay chỉ cần ghi nhật ký?
6. Thang 100 của recap có tiêu chí chấm chi tiết (nội dung, đúng hạn, độ sâu...) không?

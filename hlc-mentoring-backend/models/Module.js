const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Tên hiển thị (VD: "Đọc sách 10 trang/ngày", "Mentoring Tháng 9")
  code: { type: String, required: true, unique: true }, // Mã định danh (VD: "DOC_SACH", "MENTORING_09")
  
  // Các tuỳ chọn nộp bài do Admin thiết lập
  submissionConfig: {
    allowText: { type: Boolean, default: false }, // Có cho phép nhập text không?
    allowImage: { type: Boolean, default: false }, // Có cho phép nộp ảnh không?
    allowVideoLink: { type: Boolean, default: false }, // Có cho phép nộp link Youtube không?
  },
  
  // Các tính năng mở rộng liên kết với Module này
  featureConfig: {
    requireMentor: { type: Boolean, default: false }, // Yêu cầu người nộp phải có Mentor phụ trách?
    enableScheduling: { type: Boolean, default: false }, // Có bật tính năng đặt lịch hẹn (Booking) cho module này không?
  },
  
  isActive: { type: Boolean, default: true } // Trạng thái Bật/Tắt module
}, { timestamps: true });

module.exports = mongoose.model('Module', moduleSchema);
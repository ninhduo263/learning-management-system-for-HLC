/**
 * Bảng màu thương hiệu HLC (vòng 9) và các màu hợp tone dẫn xuất. Dùng chung cho theme Ant Design, biểu đồ và CSS
 * (globals.css khai báo cùng giá trị dưới dạng biến --brand-*).
 *
 * Quy tắc độ dễ đọc (tỷ lệ tương phản >= 4,5):
 * - Nền xanh lá / vàng / xanh dương nhạt: chữ NAVY, không dùng chữ trắng.
 * - Chữ trắng chỉ trên nền xanh dương đậm hoặc navy.
 * - Không dùng xanh lá hoặc vàng làm màu chữ trên nền trắng (chỉ làm nền, dấu nhấn).
 * - Chữ nội dung: navy trên nền trắng.
 */
export const BRAND = {
  // Màu chính
  green: '#9BCB65',
  yellow: '#F9EC3B',
  sky: '#50C4F1',
  blue: '#1172BA',
  // Màu phụ
  navy: '#0E1B4D',
  white: '#FFFFFF',
  // Hợp tone: nền nhạt từ chính các màu thương hiệu
  greenSoft: '#EEF6E4',
  yellowSoft: '#FEFAD6',
  skySoft: '#E6F6FD',
  blueSoft: '#E7F1F9',
  /** Xanh dương đậm hơn: chữ / liên kết trên nền xanh nhạt (7,0 trên trắng) */
  blueDeep: '#0D5C96',
  /** Xanh lá đậm: chỉ dùng khi buộc phải tô chữ / biểu tượng xanh lá trên nền trắng (6,1) */
  greenDeep: '#3F6E17',
  // Xám xanh trung tính
  muted: '#44506B',
  faint: '#5A6480',
  border: '#D5DEEA',
  line: '#E6ECF3',
  bg: '#F6FAFD',
  // Cảnh báo dịu (không dùng cho khoản đóng góp tình nguyện chưa có)
  warn: '#8A5A00',
  danger: '#B42318',
} as const;

/** Màu biểu đồ theo thứ tự ưu tiên (đủ phân biệt, hợp tone) */
export const CHART_SERIES = [BRAND.blue, BRAND.green, BRAND.sky, BRAND.yellow, BRAND.navy] as const;

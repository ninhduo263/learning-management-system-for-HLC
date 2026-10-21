const CLIENT_OFFSET_KEY = 'hlc_server_time_offset_ms';

/**
 * Thời điểm hiện tại theo server (đã tính ngày giả lập nếu admin bật).
 * Lưu độ lệch so với đồng hồ máy để giờ vẫn chạy theo thời gian thực.
 */
export function getCurrentTime() {
  if (typeof window !== 'undefined') {
    const offset = Number(window.localStorage.getItem(CLIENT_OFFSET_KEY) || 0);
    if (Number.isFinite(offset)) return new Date(Date.now() + offset);
  }
  return new Date();
}

/** Đồng bộ với thời điểm `now` mà server trả về (GET /time/mock) */
export function syncServerTime(serverNow: string | Date) {
  if (typeof window === 'undefined') return;
  const offset = new Date(serverNow).getTime() - Date.now();
  // Lệch dưới 1 phút coi như cùng giờ (độ trễ mạng, lệch đồng hồ nhỏ)
  window.localStorage.setItem(CLIENT_OFFSET_KEY, String(Math.abs(offset) < 60_000 ? 0 : offset));
  window.dispatchEvent(new Event('hlc-mock-date-change'));
}

/** Quý hiện tại theo giờ Việt Nam */
export function quarterOf(date = getCurrentTime()) {
  const vn = new Date(date.getTime() + 7 * 3600_000);
  const year = vn.getUTCFullYear();
  const quarter = Math.floor(vn.getUTCMonth() / 3) + 1;
  return { year, quarter, code: `${year}Q${quarter}` };
}

export function nextQuarterCode(code: string) {
  const match = /^(\d{4})Q([1-4])$/i.exec(code);
  if (!match) return '';
  const year = Number(match[1]);
  const quarter = Number(match[2]);
  return quarter === 4 ? `${year + 1}Q1` : `${year}Q${quarter + 1}`;
}

/** Từ ngày 10 tháng cuối quý: admin bắt đầu ghép cặp quý kế tiếp */
export function isNextQuarterPairingOpen(date = getCurrentTime()) {
  const vn = new Date(date.getTime() + 7 * 3600_000);
  const quarter = Math.floor(vn.getUTCMonth() / 3) + 1;
  return vn.getUTCMonth() === quarter * 3 - 1 && vn.getUTCDate() >= 10;
}

import { Chart as ChartJS } from 'chart.js';
import { BRAND } from '@/lib/brand';

/**
 * KHÔNG đặt `maintainAspectRatio` ở đây: ChartJS.defaults là toàn cục và còn lại sau khi chuyển trang, biểu đồ nào
 * không nằm trong khung cao cố định (vd. FundLedgerPanel) sẽ bị giãn vô hạn. Chart nào cần chiều cao cố định tự đặt trong options.
 */
/** Đồng bộ biểu đồ Chart.js với font và màu của giao diện. Phải gọi SAU `ChartJS.register(...)` vì plugin chỉ có defaults sau khi đăng ký. */
const FALLBACK_FONT = '"Segoe UI", system-ui, sans-serif';

export function applyChartTheme() {
  // Chart.js vẽ trên canvas nên không đọc được biến CSS: lấy đúng họ font Nunito mà next/font đã gắn cho <body>
  const FONT = typeof document !== 'undefined' ? getComputedStyle(document.body).fontFamily || FALLBACK_FONT : FALLBACK_FONT;
  ChartJS.defaults.font.family = FONT;
  ChartJS.defaults.font.size = 14;
  ChartJS.defaults.color = BRAND.muted;
  ChartJS.defaults.borderColor = BRAND.line;
  ChartJS.defaults.plugins.legend.position = 'bottom';
  ChartJS.defaults.plugins.legend.labels.usePointStyle = true;
  ChartJS.defaults.plugins.legend.labels.boxWidth = 8;
  ChartJS.defaults.plugins.legend.labels.padding = 18;
  ChartJS.defaults.plugins.tooltip.backgroundColor = BRAND.navy;
  ChartJS.defaults.plugins.tooltip.padding = 12;
  ChartJS.defaults.plugins.tooltip.cornerRadius = 10;
  ChartJS.defaults.plugins.tooltip.titleFont = { family: FONT, size: 15, weight: 800 };
  ChartJS.defaults.plugins.tooltip.bodyFont = { family: FONT, size: 14 };
}

/** Màu biểu đồ theo bảng màu thương hiệu */
export const CHART_COLORS = { primary: BRAND.blue, primarySoft: BRAND.sky, green: BRAND.green, yellow: '#E2D10F', navy: BRAND.navy };

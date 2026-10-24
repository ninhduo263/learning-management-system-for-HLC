import { Chart as ChartJS } from 'chart.js';

/**
 * KHÔNG đặt `maintainAspectRatio` ở đây: ChartJS.defaults là toàn cục và còn lại sau khi chuyển trang, biểu đồ nào
 * không nằm trong khung cao cố định (vd. FundLedgerPanel) sẽ bị giãn vô hạn. Chart nào cần chiều cao cố định tự đặt trong options.
 */
/** Đồng bộ biểu đồ Chart.js với font và màu của giao diện. Phải gọi SAU `ChartJS.register(...)` vì plugin chỉ có defaults sau khi đăng ký. */
const FONT = 'Inter, "Segoe UI", system-ui, sans-serif';

export function applyChartTheme() {
  ChartJS.defaults.font.family = FONT;
  ChartJS.defaults.font.size = 13;
  ChartJS.defaults.color = '#5f6b7e';
  ChartJS.defaults.borderColor = '#eef0f6';
  ChartJS.defaults.plugins.legend.position = 'bottom';
  ChartJS.defaults.plugins.legend.labels.usePointStyle = true;
  ChartJS.defaults.plugins.legend.labels.boxWidth = 8;
  ChartJS.defaults.plugins.legend.labels.padding = 18;
  ChartJS.defaults.plugins.tooltip.backgroundColor = '#172033';
  ChartJS.defaults.plugins.tooltip.padding = 12;
  ChartJS.defaults.plugins.tooltip.cornerRadius = 10;
  ChartJS.defaults.plugins.tooltip.titleFont = { family: FONT, size: 14, weight: 700 };
  ChartJS.defaults.plugins.tooltip.bodyFont = { family: FONT, size: 13 };
}

export const CHART_COLORS = { purple: '#6d5dfc', purpleSoft: '#c7c0ff', teal: '#0e9f91', orange: '#ec9a50' };

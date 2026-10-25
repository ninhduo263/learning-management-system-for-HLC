'use client'; // Dòng này bắt buộc phải có ở trên cùng

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App, type ThemeConfig } from 'antd'; // 1. Bổ sung import App
import { useState } from 'react';
import { BRAND } from '@/lib/brand';

const theme: ThemeConfig = {
  token: {
    // Bảng màu thương hiệu: xanh dương đậm cho hành động chính, navy cho chữ (xem lib/brand.ts)
    colorPrimary: BRAND.blue,
    colorInfo: BRAND.blue,
    colorLink: BRAND.blue,
    colorSuccess: '#6FA83A',
    colorWarning: '#D9A400',
    colorError: BRAND.danger,
    colorBgLayout: BRAND.bg,
    colorText: BRAND.navy,
    colorTextHeading: BRAND.navy,
    colorTextSecondary: BRAND.muted,
    colorTextTertiary: BRAND.faint,
    colorTextDescription: BRAND.faint,
    colorBorder: BRAND.border,
    colorBorderSecondary: BRAND.line,
    borderRadius: 12,
    // Một họ font thống nhất (Nunito, đủ dấu tiếng Việt); chữ lớn hơn mặc định của antd (14px / 12px) để dễ đọc
    fontFamily: 'var(--font-brand), "Segoe UI", system-ui, -apple-system, sans-serif',
    fontSize: 16,
    fontSizeSM: 14,
    fontSizeLG: 18,
    fontSizeHeading1: 36,
    fontSizeHeading2: 30,
    fontSizeHeading3: 25,
    fontSizeHeading4: 21,
    fontSizeHeading5: 18,
    fontWeightStrong: 800,
    controlHeight: 40,
    controlHeightSM: 32,
    controlHeightLG: 48
  },
  components: {
    Card: { headerFontSize: 19, headerFontSizeSM: 17, headerHeight: 60, headerHeightSM: 52 },
    Button: { fontWeight: 700, primaryShadow: 'none' },
    Table: {
      headerBg: BRAND.blueSoft,
      headerColor: BRAND.navy,
      headerSplitColor: 'transparent',
      rowHoverBg: '#F2F8FC',
      rowSelectedBg: BRAND.skySoft,
      rowSelectedHoverBg: '#D9F0FB',
      cellPaddingBlock: 14,
      cellPaddingBlockMD: 12,
      cellPaddingBlockSM: 10,
      cellFontSize: 16,
      cellFontSizeMD: 16,
      cellFontSizeSM: 15
    },
    Statistic: { titleFontSize: 15, contentFontSize: 30 },
    Tag: { fontSizeSM: 14 },
    Menu: {
      itemHeight: 48,
      darkItemBg: 'transparent',
      darkItemColor: '#C9D3EA',
      darkItemHoverColor: BRAND.white,
      darkItemSelectedBg: BRAND.blue,
      darkItemSelectedColor: BRAND.white
    },
    Tabs: { itemSelectedColor: BRAND.blueDeep, itemColor: BRAND.muted, itemHoverColor: BRAND.blue, inkBarColor: BRAND.blue, titleFontSize: 16 },
    Segmented: { itemSelectedColor: BRAND.navy },
    Progress: { defaultColor: BRAND.blue, remainingColor: BRAND.line }
  }
};

export default function Providers({ children }: { children: React.ReactNode }) {
  // Khởi tạo QueryClient một lần duy nhất
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={theme}>
        <App>
          {children}
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

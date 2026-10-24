'use client'; // Dòng này bắt buộc phải có ở trên cùng

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App, type ThemeConfig } from 'antd'; // 1. Bổ sung import App
import { useState } from 'react';

const theme: ThemeConfig = {
  token: {
    colorPrimary: '#6d5dfc',
    colorInfo: '#3b82f6',
    colorSuccess: '#12a06e',
    colorWarning: '#f5a524',
    colorError: '#e5484d',
    colorBgLayout: '#f6f7fb',
    colorText: '#172033',
    colorTextSecondary: '#5f6b7e',
    colorTextTertiary: '#6b7589',
    colorTextDescription: '#6b7589',
    colorBorder: '#d8dde9',
    colorBorderSecondary: '#e8ebf3',
    borderRadius: 12,
    // Chữ lớn hơn mặc định của antd (14px / 12px) để dễ đọc
    fontFamily: 'var(--font-inter), "Segoe UI", system-ui, -apple-system, sans-serif',
    fontSize: 15,
    fontSizeSM: 13,
    fontSizeLG: 17,
    fontSizeHeading1: 36,
    fontSizeHeading2: 30,
    fontSizeHeading3: 25,
    fontSizeHeading4: 21,
    fontSizeHeading5: 17,
    controlHeight: 38,
    controlHeightSM: 30,
    controlHeightLG: 46
  },
  components: {
    Card: { headerFontSize: 18, headerFontSizeSM: 16, headerHeight: 60, headerHeightSM: 50 },
    Table: {
      headerBg: '#f7f8fc',
      headerColor: '#4a5568',
      headerSplitColor: 'transparent',
      rowHoverBg: '#f7f6ff',
      cellPaddingBlock: 14,
      cellPaddingBlockMD: 12,
      cellPaddingBlockSM: 10,
      cellFontSize: 15,
      cellFontSizeMD: 15,
      cellFontSizeSM: 14
    },
    Statistic: { titleFontSize: 15, contentFontSize: 30 },
    Tag: { fontSizeSM: 13 },
    Menu: { itemHeight: 46, darkItemBg: 'transparent' },
    Tabs: { itemSelectedColor: '#6d5dfc', inkBarColor: '#6d5dfc', titleFontSize: 16 },
    Progress: { defaultColor: '#6d5dfc' }
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

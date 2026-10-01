'use client'; // Dòng này bắt buộc phải có ở trên cùng

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App } from 'antd'; // 1. Bổ sung import App
import { useState } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  // Khởi tạo QueryClient một lần duy nhất
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { colorPrimary: '#6d5dfc', borderRadius: 12, colorBgLayout: '#f6f7fb' }, components: { Card: { headerFontSize: 16 }, Tabs: { itemSelectedColor: '#6d5dfc', inkBarColor: '#6d5dfc' } } }}>
        <App>
          {children}
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
'use client'; // Dòng này bắt buộc phải có ở trên cùng

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App } from 'antd'; // 1. Bổ sung import App
import { useState } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  // Khởi tạo QueryClient một lần duy nhất
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {/* ConfigProvider của AntD với màu chủ đạo là xanh lam */}
      <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
        <App>
          {children}
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
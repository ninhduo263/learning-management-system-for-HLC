import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import MainLayout from "@/components/MainLayout"; // Bổ sung dòng import này

// Nunito: nét tròn, to, rõ (hướng giới trẻ) và đủ dấu tiếng Việt nhờ subset "vietnamese" (không rơi về font hệ thống).
// Một họ font duy nhất cho toàn bộ giao diện; font biến thiên nên có đủ độ đậm cho tiêu đề và số liệu.
const brandFont = Nunito({ subsets: ["latin", "vietnamese"], variable: "--font-brand", display: "swap", preload: false });

export const metadata: Metadata = {
  title: "HLC Mentoring System",
  description: "Hệ thống quản lý học tập và Mentoring",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={brandFont.variable}>
      <body className={brandFont.className}>
        <Providers>
          {/* Bọc MainLayout vào bên trong Providers */}
          <MainLayout>
            {children}
          </MainLayout>
        </Providers>
      </body>
    </html>
  );
}
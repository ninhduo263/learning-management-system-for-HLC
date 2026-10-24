import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import MainLayout from "@/components/MainLayout"; // Bổ sung dòng import này

// Có subset "vietnamese" để dấu tiếng Việt dùng đúng font Inter thay vì rơi về font hệ thống.
const inter = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-inter", display: "swap", preload: false });

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
    <html lang="vi" className={inter.variable}>
      <body className={inter.className}>
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
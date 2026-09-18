import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import MainLayout from "@/components/MainLayout"; // Bổ sung dòng import này

const inter = Inter({ subsets: ["latin"], preload: false });

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
    <html lang="vi">
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
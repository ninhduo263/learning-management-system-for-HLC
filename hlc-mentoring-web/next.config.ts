import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gói gọn server để chạy trong Docker (node server.js)
  output: "standalone",
};

export default nextConfig;

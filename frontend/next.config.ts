import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  allowedDevOrigins: ["192.168.1.8:3000", "localhost:3000", "127.0.0.1:3000"],
};

export default nextConfig;

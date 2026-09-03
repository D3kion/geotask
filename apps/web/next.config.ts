import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL ??
      process.env.API_URL ??
      "http://localhost:4200";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

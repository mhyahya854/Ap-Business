import type { NextConfig } from "next";

const isVercelBuild = process.env.VERCEL === "1";
const basePath = isVercelBuild ? "" : (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  ...(!isVercelBuild ? { output: "export" as const } : {}),
  trailingSlash: true,
  images: { unoptimized: true },
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/style",
  env: { NEXT_PUBLIC_BASE_PATH: "/style" },
  output: "standalone",
};

export default nextConfig;

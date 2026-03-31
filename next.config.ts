import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/translate": ["./node_modules/kuromoji/dict/**/*"],
  },
};

export default nextConfig;

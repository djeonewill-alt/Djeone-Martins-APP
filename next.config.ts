import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/*': ['./node_modules/ffmpeg-static/**/*'],
  },
};

export default nextConfig;

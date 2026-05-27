import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/admin/audio/convert-to-mp3': ['./node_modules/ffmpeg-static/**/*'],
  },
};

export default nextConfig;

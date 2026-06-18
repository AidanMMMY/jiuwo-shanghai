import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/webp'],
    deviceSizes: [640, 1080, 1920, 3840],
    imageSizes: [64, 128, 384],
    minimumCacheTTL: 31536000,
  },
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;

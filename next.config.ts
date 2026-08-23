import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['bullmq', '@valkey/valkey-glide'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

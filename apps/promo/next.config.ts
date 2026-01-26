import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@rive-app/react-canvas'],
};

export default nextConfig;

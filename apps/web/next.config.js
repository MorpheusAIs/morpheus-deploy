/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@morpheus-deploy/core', '@morpheus-deploy/contracts'],
};

module.exports = nextConfig;

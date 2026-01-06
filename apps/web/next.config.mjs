/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  transpilePackages: ['@morpheus-deploy/core', '@morpheus-deploy/contracts'],
};

export default config;

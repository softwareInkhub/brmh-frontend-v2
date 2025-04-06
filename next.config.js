/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Set a different default port
  async rewrites() {
    return [];
  },
  // Configure the port
  serverOptions: {
    port: 3001,
  },
}

module.exports = nextConfig 
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  trailingSlash: true,
  async rewrites() {
    return [
      {
        source: '/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};
export default nextConfig;
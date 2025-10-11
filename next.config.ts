/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://34.61.162.19/api/:path*", // your backend/Nginx
      },
    ];
  },
};
module.exports = nextConfig;

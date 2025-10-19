// next.config.js
/** @type {import('next').NextConfig} */
const API_ORIGIN = process.env.API_ORIGIN;

console.log("[next.config.js] NODE_ENV=", process.env.NODE_ENV);
console.log("[next.config.js] API_ORIGIN=", API_ORIGIN);

const nextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV === "development" && API_ORIGIN) {
      return [
        {
          source: "/api/:path*",
          destination: `${API_ORIGIN}/api/:path*`,
        },
      ];
    }
    return []; // 프로덕션에선 Nginx가 /api를 프록시
  },
};

module.exports = nextConfig;

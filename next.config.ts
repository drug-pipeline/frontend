// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      // beforeFiles: [],      // (필요 없으면 생략)
      // afterFiles: [],       // (필요 없으면 생략)
      fallback: [
        {
          source: "/api/:path*",
          destination: "http://34.61.162.19/api/:path*",
        },
      ],
    };
  },
};
module.exports = nextConfig;

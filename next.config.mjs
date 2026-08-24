/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.musalee.blog" }],
        destination: "https://musalee.blog/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

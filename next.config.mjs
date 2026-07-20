/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.junkyung.kim" }],
        destination: "https://junkyung.kim/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

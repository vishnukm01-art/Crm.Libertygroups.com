/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  headers: async () => [
    {
      // Aggressive caching for static assets (JS, CSS, images, fonts)
      source: "/:all*(svg|jpg|jpeg|png|gif|ico|webp|woff|woff2|ttf|eot|css|js)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
    {
      // Cache Next.js static chunks
      source: "/_next/static/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
    {
      // Cache API responses for interactions list (short cache + revalidate)
      source: "/api/interactions",
      headers: [
        { key: "Cache-Control", value: "public, s-maxage=10, stale-while-revalidate=30" },
      ],
    },
  ],
};

module.exports = nextConfig;

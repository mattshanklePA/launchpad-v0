/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // SEC-5 (#263): keep true. The Image Optimization API (/_next/image) is the
    // only route to two critical Next 14.2.35 advisories (GHSA-2464-fhr4-w9xw,
    // GHSA-2xp9-vwfh-vxw4) until the framework upgrade in #242.
    // Guarded by lib/next-config.test.ts.
    unoptimized: true,
  },
}

export default nextConfig
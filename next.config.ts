/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep this app isolated when nested temporarily under another monorepo checkout.
  turbopack: {
    root: __dirname,
  },
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "https://myjiefun.com",
  },
};

export default nextConfig;

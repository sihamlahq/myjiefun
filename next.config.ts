/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production site URL — connect custom domain in your host (Vercel/Netlify/etc.)
  // Preview tunnel URLs still work; this sets absolute links/metadata.
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "https://myjiefun.com",
  },
};

export default nextConfig;

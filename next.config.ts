import type { NextConfig } from "next";

function cdnRemotePattern(): { protocol: "https" | "http"; hostname: string; pathname: string } | null {
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;
  if (!cdnUrl) return null;
  try {
    const { protocol, hostname } = new URL(cdnUrl);
    return { protocol: protocol.replace(":", "") as "https" | "http", hostname, pathname: "/**" };
  } catch {
    return null;
  }
}

const cdnPattern = cdnRemotePattern();

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.20.120'],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
...(cdnPattern ? [cdnPattern] : []),
    ],
  },
};

export default nextConfig;

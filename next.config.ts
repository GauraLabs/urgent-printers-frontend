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
  // Pin explicitly: the orchestrator root (../) has its own package.json/package-lock.json
  // for the QA pipeline's playwright-test MCP server (see ../pipeline/README.md), and
  // Turbopack's root auto-detection picks that outer lockfile over this app's own,
  // resolving every import (e.g. 'tailwindcss') against the wrong directory.
  turbopack: {
    root: __dirname,
  },
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

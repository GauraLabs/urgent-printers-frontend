import type { MetadataRoute } from "next";
import { SITE_URL } from "./site";

export const AI_CRAWLERS: readonly string[] = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"];

// /cart, /checkout, /account and /auth are deliberately NOT disallowed: they carry a
// noindex meta (set in their layouts) that Google can only see if it may crawl them.
// Only non-page endpoints and token links stay uncrawled.
export const DISALLOWED_PATHS: readonly string[] = [
  "/api/",
  "/proof-approval/",
];

export function buildRobots(siteUrl: string = SITE_URL): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: [...DISALLOWED_PATHS] },
      { userAgent: [...AI_CRAWLERS], allow: "/", disallow: [...DISALLOWED_PATHS] },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

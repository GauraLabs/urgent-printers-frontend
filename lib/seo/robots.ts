import type { MetadataRoute } from "next";
import { SITE_URL } from "./site";

export const AI_CRAWLERS: readonly string[] = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"];

// Mirrors the noindex facet rules in lib/seo/metadata.ts. Blocking crawl of these
// would hide the noindex tag, so only private/transactional areas are disallowed.
export const DISALLOWED_PATHS: readonly string[] = [
  "/cart",
  "/checkout",
  "/account",
  "/auth",
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

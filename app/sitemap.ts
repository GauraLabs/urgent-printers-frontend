import type { MetadataRoute } from "next";
import { getSeoCatalog } from "@/lib/api";
import { buildSitemapEntries, fallbackSitemapEntries } from "@/lib/seo/sitemap";
import { withDegradedFallback } from "@/lib/seo/degraded";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return withDegradedFallback(
    "sitemap",
    async () => {
      const { categories, products } = await getSeoCatalog();
      return buildSitemapEntries(categories, products);
    },
    () => fallbackSitemapEntries(),
  );
}

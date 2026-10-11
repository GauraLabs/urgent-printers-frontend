import { getSeoCatalog } from "@/lib/api";
import { buildSitemapEntries, fallbackSitemapEntries, renderSitemapXml } from "@/lib/seo/sitemap";
import { withDegradedFallback } from "@/lib/seo/degraded";

// A plain route handler, not the app/sitemap.ts metadata convention: Next's generated
// sitemap handler hard-codes `Cache-Control: public, max-age=0, must-revalidate`, which
// suppresses the ISR `s-maxage` header, and on Vercel the sitemap then never regenerated
// (time-based or on-demand) while llms.txt, a plain route handler, did.
export const revalidate = 300;

export async function GET(): Promise<Response> {
  const entries = await withDegradedFallback(
    "sitemap",
    async () => {
      const { categories, products } = await getSeoCatalog();
      return buildSitemapEntries(categories, products);
    },
    () => fallbackSitemapEntries(),
  );
  return new Response(renderSitemapXml(entries), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}

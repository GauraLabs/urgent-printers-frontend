import { assertCatalogConsistent, getCategoriesStrict } from "@/lib/api";
import { buildLlmsTxt } from "@/lib/seo/llms";
import { withDegradedFallback } from "@/lib/seo/degraded";

export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const body = await withDegradedFallback(
    "llms.txt",
    async () => {
      const categories = await getCategoriesStrict();
      assertCatalogConsistent(categories, null);
      return buildLlmsTxt(categories);
    },
    () => buildLlmsTxt([]),
  );
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

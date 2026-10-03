export const SLUG_RE = /^[a-z0-9-]+$/;
export const MAX_ITEMS = 200;

export type RevalidatePlan =
  | { ok: true; all: true; paths: [] }
  | { ok: true; all: false; paths: string[] }
  | { ok: false; error: string };

function isSlug(value: unknown): value is string {
  return typeof value === "string" && SLUG_RE.test(value);
}

// Validates the backend's POST body ({products, category_slugs, all}) and
// expands it to the literal paths to revalidate. Nothing from the payload
// reaches revalidatePath unless every slug matched SLUG_RE, so a caller with
// the secret still can't invalidate arbitrary paths.
export function planProductRevalidation(body: unknown): RevalidatePlan {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Body must be a JSON object" };
  }
  const { products = [], category_slugs: categorySlugs = [], all = false } = body as Record<string, unknown>;

  if (typeof all !== "boolean") return { ok: false, error: "`all` must be a boolean" };
  if (all) return { ok: true, all: true, paths: [] };

  if (!Array.isArray(products) || !Array.isArray(categorySlugs)) {
    return { ok: false, error: "`products` and `category_slugs` must be arrays" };
  }
  if (products.length > MAX_ITEMS || categorySlugs.length > MAX_ITEMS) {
    return { ok: false, error: `At most ${MAX_ITEMS} items per array` };
  }

  const paths = new Set<string>(["/"]);
  for (const item of products) {
    const entry = item as { category_slug?: unknown; slug?: unknown } | null;
    if (entry === null || typeof entry !== "object" || !isSlug(entry.category_slug) || !isSlug(entry.slug)) {
      return { ok: false, error: "Invalid product entry" };
    }
    paths.add(`/products/${entry.category_slug}/${entry.slug}`);
    paths.add(`/products/${entry.category_slug}`);
  }
  for (const slug of categorySlugs) {
    if (!isSlug(slug)) return { ok: false, error: "Invalid category slug" };
    paths.add(`/products/${slug}`);
  }
  return { ok: true, all: false, paths: [...paths] };
}

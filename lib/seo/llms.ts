import type { Category } from "@/types";
import { ROUTES } from "@/lib/constants/routes";
import { absoluteUrl, CONTACT_PHONE_DISPLAY, SITE_NAME, SITE_URL } from "./site";
import { isCategoryIndexable } from "./category";

const POLICY_LINKS: ReadonlyArray<{ title: string; path: string }> = [
  { title: "Shipping policy", path: "/policies/shipping" },
  { title: "Returns and refunds", path: "/policies/returns" },
  { title: "Artwork guidelines", path: "/policies/artwork-guidelines" },
  { title: "Privacy policy", path: "/policies/privacy" },
  { title: "Terms of service", path: "/policies/terms" },
  { title: "FAQ", path: "/faq" },
  { title: "Contact", path: "/contact" },
];

function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Depth-first, parents before children, siblings by sortOrder. Orphans (parent not in the list) surface as roots. */
function flattenHierarchy(list: Category[]): { category: Category; depth: number }[] {
  const ids = new Set(list.map((c) => c.id));
  const byParent = new Map<string | null, Category[]>();
  for (const c of list) {
    const key = c.parentId != null && ids.has(c.parentId) && c.parentId !== c.id ? c.parentId : null;
    byParent.set(key, [...(byParent.get(key) ?? []), c]);
  }
  const out: { category: Category; depth: number }[] = [];
  const seen = new Set<string>();
  function walk(key: string | null, depth: number): void {
    const kids = [...(byParent.get(key) ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    for (const c of kids) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push({ category: c, depth });
      walk(c.id, depth + 1);
    }
  }
  walk(null, 0);
  return out;
}

export function buildLlmsTxt(categories: Category[], siteUrl: string = SITE_URL): string {
  const active = categories.filter(isCategoryIndexable);
  const lines: string[] = [
    `# ${SITE_NAME}`,
    "",
    "> Online printing store for weddings and celebrations in India: wedding cards and invitations, shagun envelopes, wedding essentials, welcome boards, and birthday and anniversary printing. Orders are customised online, printed to order, and delivered across India. All prices are in INR.",
    "",
    "## Shop",
    "",
    `- [All products](${absoluteUrl(ROUTES.products, siteUrl)}): the full catalogue`,
  ];
  for (const { category: c, depth } of flattenHierarchy(active)) {
    const desc = oneLine(c.description ?? "");
    lines.push(`${"  ".repeat(depth)}- [${c.name}](${absoluteUrl(ROUTES.category(c.slug), siteUrl)})${desc ? `: ${desc}` : ""}`);
  }
  lines.push("", "## Policies and help", "");
  for (const p of POLICY_LINKS) lines.push(`- [${p.title}](${absoluteUrl(p.path, siteUrl)})`);
  lines.push("", "## Contact", "", `- Phone: ${CONTACT_PHONE_DISPLAY}`);
  lines.push("", `Sitemap: ${siteUrl}/sitemap.xml`, "");
  return lines.join("\n");
}

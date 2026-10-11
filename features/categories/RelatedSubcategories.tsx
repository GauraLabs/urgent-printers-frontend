import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import type { Category, CategoryRef } from "@/types";

interface RelatedSubcategoriesProps {
  parent: CategoryRef | null;
  siblings: Category[];
}

export function RelatedSubcategories({ parent, siblings }: RelatedSubcategoriesProps) {
  if (!parent && siblings.length === 0) return null;
  return (
    <nav aria-label="Related categories" className="border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h2 className="font-heading font-semibold text-lg mb-3">
          {parent ? `More from ${parent.name}` : "Related categories"}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {parent && (
            <li>
              <Link
                href={ROUTES.category(parent.slug)}
                className="inline-flex min-h-11 items-center rounded-full border border-primary/50 bg-primary/10 px-4 text-sm font-medium text-primary"
              >
                Shop all {parent.name}
              </Link>
            </li>
          )}
          {siblings.map((c) => (
            <li key={c.id}>
              <Link
                href={ROUTES.category(c.slug)}
                className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-sm font-medium hover:border-primary/40 hover:text-primary"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

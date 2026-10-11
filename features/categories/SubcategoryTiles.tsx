import { useId } from "react";
import Link from "next/link";
import { CategoryTile } from "@/features/navigation/CategoryTile";
import { getRealCategoryImage } from "@/features/navigation/categoryImage";
import { ROUTES } from "@/lib/constants/routes";
import type { Category } from "@/types";

interface SubcategoryTilesProps {
  parent: Pick<Category, "name">;
  subcategories: Category[];
}

export function SubcategoryTiles({ parent, subcategories }: SubcategoryTilesProps) {
  const headingId = useId();
  if (subcategories.length === 0) return null;
  return (
    <nav aria-labelledby={headingId} className="border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
        <h2 id={headingId} className="font-heading font-semibold text-lg md:text-xl mb-3">Shop {parent.name} by type</h2>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {subcategories.map((c) => (
            <li key={c.id}>
              <Link
                href={ROUTES.category(c.slug)}
                className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-card p-2.5 transition-colors hover:border-primary/40"
              >
                <CategoryTile name={c.name} imageUrl={getRealCategoryImage(c)} className="h-12 w-12" sizes="48px" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium leading-tight">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {c.productCount} {c.productCount === 1 ? "product" : "products"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

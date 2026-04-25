import type { Metadata } from "next";
import Link from "next/link";
import { Search, TrendingUp } from "lucide-react";
import { searchProducts, getCategories } from "@/lib/api";
import { ProductCard } from "@/features/products/ProductCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Breadcrumb } from "@/components/common/Breadcrumb";
import { ROUTES } from "@/lib/constants/routes";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const title = q ? `Results for "${q}"` : "Search";
  return {
    title,
    description: q
      ? `Find print products matching "${q}" — business cards, flyers, banners, and more.`
      : "Search our full range of printing products.",
  };
}

const POPULAR_TERMS = [
  "Business Cards", "A5 Flyers", "Vinyl Banners",
  "Custom T-Shirts", "Packaging Boxes", "Tri-Fold Brochures",
  "Luxury Foil Cards", "Eco Packaging", "Embroidered Caps",
];

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  const [results, categories] = await Promise.all([
    query.length >= 2 ? searchProducts(query) : Promise.resolve([]),
    getCategories(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb items={[{ label: query ? `Results for "${query}"` : "Search" }]} className="mb-6" />

      {/* Page heading */}
      {query ? (
        <div className="mb-8">
          <h1 className="font-heading font-bold text-2xl lg:text-3xl">
            Results for <span className="text-primary">&ldquo;{query}&rdquo;</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {results.length} product{results.length !== 1 ? "s" : ""} found
          </p>
        </div>
      ) : (
        <div className="mb-8">
          <h1 className="font-heading font-bold text-2xl lg:text-3xl">Search</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Find the perfect print product for your business
          </p>
        </div>
      )}

      {/* Search bar (inline for no-JS fallback and direct navigation) */}
      <form action={ROUTES.search} method="GET" className="mb-10">
        <div className="relative max-w-xl">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search products, categories…"
            autoFocus={!query}
            className="w-full h-12 pl-12 pr-4 rounded-2xl border-2 border-border bg-card text-base focus:outline-none focus:border-primary transition-colors shadow-sm"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {/* Results grid */}
      {query.length >= 2 && results.length > 0 && (
        <section aria-label="Search results">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
            {results.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* No results */}
      {query.length >= 2 && results.length === 0 && (
        <EmptyState
          icon={Search}
          title={`No results for "${query}"`}
          description="Try a different search term, or browse by category below."
        />
      )}

      {/* Popular + category suggestions */}
      <div className="mt-12 space-y-10">
        {/* Popular searches */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-primary" />
            <h2 className="font-heading font-semibold text-base">Popular Searches</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {POPULAR_TERMS.map((term) => (
              <Link
                key={term}
                href={`${ROUTES.search}?q=${encodeURIComponent(term)}`}
                className="px-4 py-2 rounded-full text-sm font-medium border border-border bg-card hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all"
              >
                {term}
              </Link>
            ))}
          </div>
        </section>

        {/* Browse by category */}
        <section>
          <h2 className="font-heading font-semibold text-base mb-4">Browse by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={ROUTES.category(cat.slug)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all text-center group"
              >
                <span className="text-2xl">
                  {cat.slug === "business-cards" ? "🪪"
                   : cat.slug === "flyers"       ? "📄"
                   : cat.slug === "banners"      ? "🚩"
                   : cat.slug === "packaging"    ? "📦"
                   : cat.slug === "brochures"    ? "📋"
                   : "👕"}
                </span>
                <span className="text-xs font-semibold group-hover:text-primary transition-colors leading-tight">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

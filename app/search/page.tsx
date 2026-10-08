import type { Metadata } from "next";
import Link from "next/link";
import { Search, TrendingUp } from "lucide-react";
import { searchProductsPaged, getCategories, getPopularSearches } from "@/lib/api";
import { ProductCard } from "@/features/products/ProductCard";
import { EmptyState } from "@/components/common/EmptyState";
import { SafeImage } from "@/components/common/SafeImage";
import { Breadcrumb } from "@/components/common/Breadcrumb";
import { SearchPageProvider, SearchPageForm, SearchResultsFrame } from "@/features/products/SearchPageClient";
import { ROUTES } from "@/lib/constants/routes";
import { FALLBACK_POPULAR_SEARCHES } from "@/lib/constants/popularSearches";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const title = q ? `Results for "${q}"` : "Search";
  return {
    title,
    description: q
      ? `Find wedding and celebration products matching "${q}" — cards, envelopes, welcome boards, and more.`
      : "Search wedding cards, shagun envelopes, welcome boards and more.",
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  const [{ data: results, total }, categories, popularSearches] = await Promise.all([
    query.length >= 2
      ? searchProductsPaged(query, 1, 24)
      : Promise.resolve({ data: [], total: 0, page: 1, pageSize: 24, totalPages: 0 }),
    getCategories(),
    getPopularSearches(),
  ]);

  const terms = popularSearches.length > 0 ? popularSearches : FALLBACK_POPULAR_SEARCHES;

  return (
    <SearchPageProvider>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb items={[{ label: query ? `Results for "${query}"` : "Search" }]} className="mb-6" />

      {/* Page heading */}
      {query ? (
        <div className="mb-8">
          <h1 className="font-heading font-bold text-2xl lg:text-3xl">
            Results for <span className="text-primary">&ldquo;{query}&rdquo;</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total} product{total !== 1 ? "s" : ""} found
          </p>
        </div>
      ) : (
        <div className="mb-8">
          <h1 className="font-heading font-bold text-2xl lg:text-3xl">Search</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Find the perfect card, envelope or keepsake for your celebration
          </p>
        </div>
      )}

      <SearchPageForm query={query} />

      <SearchResultsFrame>
        {/* Results grid */}
        {query.length >= 2 && total > 0 && (
          <section aria-label="Search results">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
              {results.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 289px"
                />
              ))}
            </div>
          </section>
        )}

        {/* No results */}
        {query.length >= 2 && total === 0 && (
          <EmptyState
            icon={Search}
            title={`No results for "${query}"`}
            description="Try a different search term, or browse by category below."
          />
        )}
      </SearchResultsFrame>

      {/* Popular + category suggestions */}
      <div className="mt-12 space-y-10">
        {/* Popular searches */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-primary" />
            <h2 className="font-heading font-semibold text-base">Popular Searches</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {terms.map((term) => (
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
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 shadow-sm hover:shadow-md transition-all text-center group"
              >
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
                  <SafeImage
                    src={cat.thumbnailUrl ?? cat.imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
                <span className="text-xs font-semibold group-hover:text-primary transition-colors leading-tight">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
    </SearchPageProvider>
  );
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/features/products/ProductCard";
import { toCardProduct, type CardProduct } from "@/features/products/cardProduct";
import { cn } from "@/lib/utils";
import { RailShell } from "./RailShell";

interface ProductRailSectionProps {
  /** Unique per page; becomes the heading id for aria-labelledby. */
  id: string;
  title: string;
  description?: string | null;
  seeAllHref: string;
  seeAllLabel: string;
  products: CardProduct[];
  tinted?: boolean;
}

export function ProductRailSection({
  id,
  title,
  description,
  seeAllHref,
  seeAllLabel,
  products,
  tinted = false,
}: ProductRailSectionProps) {
  if (products.length === 0) return null;
  const headingId = `${id}-heading`;

  return (
    <section aria-labelledby={headingId} className={cn("py-8 lg:py-10", tinted && "bg-secondary/60")}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RailShell
          heading={
            <div className="min-w-0">
              <h2 id={headingId} className="font-heading font-bold text-xl lg:text-2xl truncate">
                {title}
              </h2>
              {description && <p className="text-muted-foreground mt-1 text-sm line-clamp-1">{description}</p>}
            </div>
          }
          seeAll={
            <Link
              href={seeAllHref}
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline whitespace-nowrap"
            >
              {seeAllLabel} <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        >
          {products.map((p) => (
            <div key={p.id} className="w-[62%] sm:w-[38%] md:w-[28%] lg:w-[21%] shrink-0 snap-start">
              <ProductCard
                product={toCardProduct(p)}
                sizes="(max-width: 639px) 62vw, (max-width: 767px) 38vw, (max-width: 1023px) 28vw, 21vw"
              />
            </div>
          ))}
        </RailShell>
      </div>
    </section>
  );
}

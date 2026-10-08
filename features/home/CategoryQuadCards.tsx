import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getRealCategoryImage } from "@/features/navigation/categoryImage";
import { SafeImage } from "@/components/common/SafeImage";
import { productHref } from "@/features/products/productHref";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { CardProduct } from "@/features/products/cardProduct";
import type { Category } from "@/types";
import { QUAD_SLOTS, type QuadCard } from "./shelfBuckets";

interface CategoryQuadCardsProps {
  cards: QuadCard[];
}


function Thumb({ product, caption, className }: { product: CardProduct; caption: string; className?: string }) {
  return (
    <Link
      href={productHref(product)}
      className={cn("group relative block overflow-hidden rounded-lg bg-muted", className)}
    >
      <SafeImage
        src={product.mediumUrl ?? product.images[0]}
        alt={product.name}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes="(max-width: 639px) 40vw, (max-width: 1023px) 21vw, 11vw"
      />
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-[11px] font-medium leading-tight text-white line-clamp-2">
        {caption}
      </span>
    </Link>
  );
}

function ExploreTile({ category, className }: { category: Category; className?: string }) {
  const image = getRealCategoryImage(category);
  return (
    <Link
      href={ROUTES.category(category.slug)}
      className={cn(
        "group relative flex items-center justify-center overflow-hidden rounded-lg p-3 text-center",
        !image && "bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20",
        className
      )}
    >
      {image && (
        <>
          <SafeImage
            src={image}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 639px) 80vw, (max-width: 1023px) 40vw, 22vw"
          />
          <span className="absolute inset-0 bg-black/45" aria-hidden="true" />
        </>
      )}
      <span
        className={cn(
          "relative flex items-center gap-1 text-sm font-semibold",
          image ? "text-white" : "text-primary"
        )}
      >
        Explore {category.name} <ArrowRight size={14} aria-hidden="true" />
      </span>
    </Link>
  );
}

function CardShell({
  id,
  title,
  seeAllHref,
  seeAllLabel,
  children,
}: {
  id: string;
  title: string;
  seeAllHref: string;
  seeAllLabel: string;
  children: React.ReactNode;
}) {
  return (
    <article
      aria-labelledby={id}
      className="flex w-full flex-col rounded-2xl border border-border bg-card p-4 shadow-sm sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-1.125rem)]"
    >
      <h3 id={id} className="font-heading font-bold text-lg mb-3 truncate">
        {title}
      </h3>
      <div className="grid grid-cols-2 grid-rows-2 gap-2 aspect-square">{children}</div>
      <Link href={seeAllHref} className="mt-3 text-sm font-medium text-primary hover:underline">
        {seeAllLabel}
      </Link>
    </article>
  );
}

function CategoryCard({ category, products }: { category: Category; products: CardProduct[] }) {
  const shown = products.slice(0, QUAD_SLOTS);
  const n = shown.length;
  const id = `quad-${category.slug}-heading`;
  return (
    <CardShell id={id} title={category.name} seeAllHref={ROUTES.category(category.slug)} seeAllLabel={`See all ${category.name}`}>
      {shown.map((p, i) => (
        <Thumb
          key={p.id}
          product={p}
          caption={p.name}
          className={cn(n === 1 && i === 0 && "row-span-2")}
        />
      ))}
      {n < QUAD_SLOTS && (
        <ExploreTile
          category={category}
          className={cn(n === 1 && "row-span-2", n === 2 && "col-span-2")}
        />
      )}
    </CardShell>
  );
}

export function CategoryQuadCards({ cards }: CategoryQuadCardsProps) {
  if (cards.length === 0) return null;

  return (
    <section aria-label="More to explore" className="py-5 md:py-8 lg:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Fixed card widths (full / half / quarter) centred in the row, so one or two
            cards stay card-sized instead of stretching into huge squares. */}
        <div className="flex flex-wrap justify-center gap-4 lg:gap-6">
          {cards.map((card) =>
            card.kind === "category" ? (
              <CategoryCard key={card.shelf.category.id} category={card.shelf.category} products={card.shelf.products} />
            ) : (
              <CardShell
                key={card.cells.map((c) => c.category.id).join("-")}
                id={`quad-merged-${card.cells[0].category.slug}-heading`}
                title="More occasions"
                seeAllHref={ROUTES.products}
                seeAllLabel="Browse all products"
              >
                {card.cells.map((c) => (
                  <Thumb key={c.product.id} product={c.product} caption={c.category.name} />
                ))}
                {card.cells.length < QUAD_SLOTS && (
                  <Link
                    href={ROUTES.products}
                    className={cn(
                      "flex items-center justify-center rounded-lg bg-primary/10 p-3 text-center text-sm font-semibold text-primary",
                      card.cells.length === 2 && "col-span-2",
                      card.cells.length === 1 && "row-span-2"
                    )}
                  >
                    Explore all <ArrowRight size={14} className="ml-1" aria-hidden="true" />
                  </Link>
                )}
              </CardShell>
            )
          )}
        </div>
      </div>
    </section>
  );
}

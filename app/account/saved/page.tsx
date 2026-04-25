"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Trash2, ArrowRight } from "lucide-react";
import { useWishlistStore } from "@/features/wishlist/store";
import { EmptyState } from "@/components/common/EmptyState";
import { ROUTES } from "@/lib/constants/routes";

export default function SavedItemsPage() {
  const items = useWishlistStore((s) => s.items);
  const removeItem = useWishlistStore((s) => s.removeItem);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl">Saved Items</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {items.length} item{items.length !== 1 ? "s" : ""} saved
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No saved items"
          description="Tap the heart on any product to save it for later."
          actionLabel="Browse Products"
          actionHref={ROUTES.products}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex gap-4 p-4 rounded-2xl border border-border bg-card"
            >
              <Link href={ROUTES.product(item.productSlug.split("-").slice(0, -2).join("-") || "products", item.productSlug)}>
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted shrink-0">
                  <Image src={item.productImage} alt={item.productName} fill className="object-cover" sizes="80px" />
                </div>
              </Link>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <Link
                    href={ROUTES.product(item.productSlug.split("-").slice(0, -2).join("-") || "products", item.productSlug)}
                    className="font-semibold text-sm hover:text-primary transition-colors line-clamp-2 leading-snug"
                  >
                    {item.productName}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-1">
                    Saved {new Date(item.addedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <Link
                    href={ROUTES.product(item.productSlug.split("-").slice(0, -2).join("-") || "products", item.productSlug)}
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    Configure <ArrowRight size={11} />
                  </Link>
                  <button
                    onClick={() => removeItem(item.productId)}
                    aria-label="Remove from saved"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors ml-auto"
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

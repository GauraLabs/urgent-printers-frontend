import { getRelatedProducts } from "@/lib/api";
import { ProductCard } from "./ProductCard";

interface RelatedProductsProps {
  productId: string;
  categorySlug: string;
}

export async function RelatedProducts({ productId, categorySlug }: RelatedProductsProps) {
  const products = await getRelatedProducts(productId, categorySlug, 4);
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="related-heading" className="mt-16 pt-10 border-t border-border">
      <h2 id="related-heading" className="font-heading font-bold text-xl mb-6">
        You Might Also Like
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

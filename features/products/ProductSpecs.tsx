import type { Product } from "@/types";

export interface SpecRow {
  label: string;
  value: string;
}

/** Rows for the Specifications accordion, from the product's real printSpec; empty groups are skipped. */
export function buildSpecRows(product: Pick<Product, "printSpec">): SpecRow[] {
  const { sizes, papers, finishes, sides, minDpi, bleedMm } = product.printSpec;
  const rows: SpecRow[] = [];
  const list = (label: string, items: { label: string }[]) => {
    if (items.length > 0) rows.push({ label, value: items.map((i) => i.label).join(", ") });
  };
  list("Size", sizes);
  list("Paper", papers);
  list("Finish", finishes);
  list("Printing sides", sides);
  if (minDpi) rows.push({ label: "Artwork resolution", value: `Minimum ${minDpi} DPI` });
  if (bleedMm) rows.push({ label: "Bleed", value: `${bleedMm} mm on all sides` });
  return rows;
}

export function ProductSpecs({ rows }: { rows: SpecRow[] }) {
  return (
    <dl className="divide-y divide-border text-sm">
      {rows.map((r) => (
        <div key={r.label} className="flex gap-4 py-2">
          <dt className="w-28 shrink-0 text-muted-foreground">{r.label}</dt>
          <dd className="min-w-0 break-words font-medium">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

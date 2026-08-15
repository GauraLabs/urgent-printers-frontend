"use client";

import { Ruler } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SizeOption, PaperOption } from "@/types";

interface SizeSpecGuideProps {
  sizes: SizeOption[];
  papers: PaperOption[];
}

function PopularTag() {
  return (
    <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide align-middle">
      Popular
    </span>
  );
}

// A modal (rather than an inline expand) keeps the configurator's own
// scroll length unaffected — the comparison data (up to ~4 sizes and ~4
// paper stocks, each with a description) is too much to inline without
// pushing Add to Cart further down the page on mobile, which the trust
// badges above are explicitly trying to avoid.
export function SizeSpecGuide({ sizes, papers }: SizeSpecGuideProps) {
  if (sizes.length === 0 && papers.length === 0) return null;

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" className="w-fit" />}>
        <Ruler size={14} />
        Compare sizes &amp; paper
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Size &amp; Paper Guide</DialogTitle>
          <DialogDescription>
            A closer look at what each option actually measures up to.
          </DialogDescription>
        </DialogHeader>

        {sizes.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Sizes
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40">
                  <tr>
                    <th className="text-left font-medium px-3 py-2">Size</th>
                    <th className="text-left font-medium px-3 py-2">Dimensions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sizes.map((size) => (
                    <tr key={size.id}>
                      <td className="px-3 py-2">
                        {size.label}
                        {size.isDefault && <PopularTag />}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground tabular-nums whitespace-nowrap">
                        {size.width} × {size.height} {size.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {papers.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Paper / Material
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40">
                  <tr>
                    <th className="text-left font-medium px-3 py-2">Stock</th>
                    <th className="text-left font-medium px-3 py-2">Weight</th>
                    <th className="text-left font-medium px-3 py-2">Feel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {papers.map((paper) => (
                    <tr key={paper.id}>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {paper.label}
                        {paper.isDefault && <PopularTag />}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground tabular-nums whitespace-nowrap">
                        {paper.weight || "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{paper.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

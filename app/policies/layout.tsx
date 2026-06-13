import type { Metadata } from "next";
import { PolicyNav } from "./PolicyNav";

export const metadata: Metadata = { title: { template: "%s — Policies | Urgent Printers", default: "Policies" } };

export default function PoliciesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col lg:flex-row gap-10">
        <aside className="lg:w-52 shrink-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-2">Legal & Policies</p>
          <PolicyNav />
        </aside>
        <main className="flex-1 min-w-0 prose prose-sm max-w-none
          prose-headings:font-heading prose-headings:font-bold prose-headings:text-foreground
          prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
          {children}
        </main>
      </div>
    </div>
  );
}

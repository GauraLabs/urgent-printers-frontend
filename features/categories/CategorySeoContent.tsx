import { ChevronDown } from "lucide-react";
import type { CategoryFaq } from "@/types";

export function CategoryIntro({ paragraphs }: { paragraphs: string[] }) {
  if (paragraphs.length === 0) return null;
  return (
    <div className="mt-2 max-w-3xl space-y-2 text-sm text-muted-foreground">
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

interface CategorySeoBodyProps {
  name: string;
  paragraphs: string[];
  faqs: CategoryFaq[];
}

export function CategorySeoBody({ name, paragraphs, faqs }: CategorySeoBodyProps) {
  if (paragraphs.length === 0 && faqs.length === 0) return null;
  return (
    <div className="border-t border-border">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {paragraphs.length > 0 && (
          <section aria-label={`About ${name}`} className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </section>
        )}
        {faqs.length > 0 && (
          <section aria-labelledby="category-faq-heading">
            <h2 id="category-faq-heading" className="font-heading font-bold text-xl mb-3">
              {name} FAQs
            </h2>
            <div className="divide-y divide-border rounded-xl border border-border">
              {faqs.map((f, i) => (
                <details key={i} className="group p-4">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-medium">
                    {f.question}
                    <ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="mt-2 text-sm text-muted-foreground">{f.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

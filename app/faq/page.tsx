import type { Metadata } from "next";
import { HelpCircle } from "lucide-react";
import { getFaqs } from "@/lib/api";
import { FaqAccordionItem } from "./FaqAccordionItem";
import type { Faq } from "@/types";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about ordering, artwork, shipping, and payments at Urgent Printers.",
};

function groupByCategory(faqs: Faq[]): Map<string, Faq[]> {
  const grouped = new Map<string, Faq[]>();
  for (const faq of faqs) {
    const category = faq.category ?? "General";
    const bucket = grouped.get(category);
    if (bucket) {
      bucket.push(faq);
    } else {
      grouped.set(category, [faq]);
    }
  }
  return grouped;
}

export default async function FaqPage() {
  const faqs = await getFaqs();
  const grouped = groupByCategory(faqs);

  const faqPageJsonLd =
    faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }
      : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {faqPageJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqPageJsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}

      <div className="mb-8 text-center">
        <h1 className="font-heading font-bold text-2xl lg:text-3xl">Frequently Asked Questions</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Answers to common questions about ordering, artwork, shipping, and payments.
        </p>
      </div>

      {grouped.size === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <HelpCircle size={28} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-heading font-semibold">No FAQs available yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Check back soon, or reach out to our support team with any questions.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([category, items]) => (
            <div key={category}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {category}
              </p>
              <div className="space-y-3">
                {items.map((faq) => (
                  <FaqAccordionItem key={faq.id} faq={faq} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

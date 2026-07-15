"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Faq } from "@/types";

interface FaqAccordionItemProps {
  faq: Faq;
}

export function FaqAccordionItem({ faq }: FaqAccordionItemProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left"
      >
        <span className="font-heading font-semibold text-sm sm:text-base">{faq.question}</span>
        <ChevronDown
          size={18}
          className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 -mt-1">
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{faq.answer}</p>
        </div>
      )}
    </div>
  );
}

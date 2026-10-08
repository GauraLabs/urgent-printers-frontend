"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FooterLinkGroupProps {
  title: string;
  links: { label: string; href: string }[];
}

// md+: a plain heading and an always-visible list (unchanged). Below md: the
// heading is a disclosure button and the list collapses.
export function FooterLinkGroup({ title, links }: FooterLinkGroupProps) {
  const [open, setOpen] = useState(false);
  const panelId = `footer-${title.toLowerCase()}`;

  return (
    <div className="max-md:col-span-2 max-md:border-b max-md:border-border">
      <h3 className="hidden md:block font-heading font-semibold text-sm mb-4">{title}</h3>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="md:hidden flex min-h-12 w-full items-center justify-between font-heading font-semibold text-sm"
      >
        {title}
        <ChevronDown size={16} className={cn("transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden="true" />
      </button>
      <ul id={panelId} className={cn("space-y-2.5 max-md:space-y-0 max-md:pb-3", !open && "max-md:hidden")}>
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors max-md:inline-flex max-md:min-h-9 max-md:items-center"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

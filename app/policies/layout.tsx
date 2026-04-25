import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Shield, Cookie, Truck, RotateCcw, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: { template: "%s — Policies | Urgent Printers", default: "Policies" } };

const POLICY_LINKS = [
  { href: "/policies/privacy",            label: "Privacy Policy",         icon: Shield    },
  { href: "/policies/terms",              label: "Terms of Service",       icon: FileText  },
  { href: "/policies/cookies",            label: "Cookie Policy",          icon: Cookie    },
  { href: "/policies/shipping",           label: "Shipping Info",          icon: Truck     },
  { href: "/policies/returns",            label: "Returns Policy",         icon: RotateCcw },
  { href: "/policies/artwork-guidelines", label: "Artwork Guidelines",     icon: Palette   },
];

export default function PoliciesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col lg:flex-row gap-10">
        <aside className="lg:w-52 shrink-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-2">Legal & Policies</p>
          <nav className="flex flex-col gap-0.5">
            {POLICY_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
                  "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon size={14} className="shrink-0" />
                {label}
              </Link>
            ))}
          </nav>
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Shield, Cookie, Truck, RotateCcw, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

const POLICY_LINKS = [
  { href: "/policies/privacy",            label: "Privacy Policy",         icon: Shield    },
  { href: "/policies/terms",              label: "Terms of Service",       icon: FileText  },
  { href: "/policies/cookies",            label: "Cookie Policy",          icon: Cookie    },
  { href: "/policies/shipping",           label: "Shipping Info",          icon: Truck     },
  { href: "/policies/returns",            label: "Returns Policy",         icon: RotateCcw },
  { href: "/policies/artwork-guidelines", label: "Artwork Guidelines",     icon: Palette   },
];

export function PolicyNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {POLICY_LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Icon size={14} className="shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
